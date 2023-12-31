const serialport = require('serialport');
const express = require('express');
const mysql = require('mysql2');

const SERIAL_BAUD_RATE = 9600;
const SERVIDOR_PORTA = 3000;
const HABILITAR_OPERACAO_INSERIR = true;

const serial = async (
    valoresDht11Umidade,
    valoresDht11Temperatura,
    valoresLuminosidade,
    valoresLm35Temperatura,
    valoresChave
) => {
    const poolBancoDados = mysql.createPool(
        {
            host: '10.18.33.58',
            port: 3306,
            user: 'insertCoffeeFlow',
            password: 'coffeeflow10',
            database: 'coffeeflow'
        }
    ).promise();

    const portas = await serialport.SerialPort.list();
    const portaArduino = portas.find((porta) => porta.vendorId == 2341 && porta.productId == 43);
    if (!portaArduino) {
        throw new Error('O arduino não foi encontrado em nenhuma porta serial');
    }
    const arduino = new serialport.SerialPort(
        {
            path: portaArduino.path,
            baudRate: SERIAL_BAUD_RATE
        }
    );
    arduino.on('open', () => {
        console.log(`A leitura do arduino foi iniciada na porta ${portaArduino.path} utilizando Baud Rate de ${SERIAL_BAUD_RATE}`);
    });
    arduino.pipe(new serialport.ReadlineParser({ delimiter: '\r\n' })).on('data', async (data) => {
        const valores = data.split(',');
        var dht11Umidade = parseFloat(valores[0]) + Math.random();
        var dht11Temperatura = parseFloat(valores[1]) + Math.random();
        var lm35Temperatura = parseFloat(valores[2]) + Math.random();
        var luminosidade = parseFloat(valores[3]) + Math.random();
        var chave = parseFloat(valores[4]) + Math.random();
        var dht11_umidadefx = dht11Umidade;
        var dht11Temperaturafx = dht11Temperatura;
        var lm35_temperaturafx = lm35Temperatura;

        valoresDht11Umidade.push(dht11Umidade);
        valoresDht11Temperatura.push(dht11Temperatura);
        valoresLuminosidade.push(luminosidade);
        valoresLm35Temperatura.push(lm35Temperatura);
        valoresChave.push(chave);

        var idRegistro = 0;

        if (HABILITAR_OPERACAO_INSERIR) {
            //'INSERT INTO sensores (dht11_umidade, dht11_temperatura, luminosidade, lm35_temperatura, chave) VALUES (?, ?, ?, ?, ?)',
            // await poolBancoDados.execute(
            //     `INSERT INTO registro (idLavoura, idQuadrante, idTipo, valor) VALUES (1, ${contador}, 2, ?);`
            // );


            await poolBancoDados.execute(
                `select max(idRegistro) as idRegistro from registro;`
                ).then(function(resposta){
                    idRegistro = resposta[0][0].idRegistro+1;
                    console.log(idRegistro)
                    if(isNaN(idRegistro)){
                        idRegistro = 1; 
                    }
                
            for (var contador = 1; contador <= 16; contador++) {
            // DHT11 Umidade
            poolBancoDados.execute(
                `INSERT INTO registro (idRegistro, idLavoura, idQuadrante, idTipo, valor) VALUES (${idRegistro}, 1, ${contador}, 2, ?);`,
                [dht11Umidade]
            );
            // //DHT11 Temperatura
            poolBancoDados.execute(
                `INSERT INTO registro (idRegistro, idLavoura, idQuadrante, idTipo, valor) VALUES (${idRegistro}, 1, ${contador}, 1, ?);`,
                [dht11Temperatura]
            );
            // // //LDR Luminosidade
            // // // await poolBancoDados.execute(
            // // //     'INSERT INTO dados (idSensor, valor) VALUES (3, ?)',
            // // //     [luminosidade]
            // // // );
            // // //LM35 Temperatura
            poolBancoDados.execute(
                `INSERT INTO registro (idRegistro, idLavoura, idQuadrante, idTipo, valor) VALUES (${idRegistro}, 1, ${contador}, 3, ?);`,
                [lm35Temperatura]
            );
            // // //Proximidade
            // await poolBancoDados.execute(
            //     'INSERT INTO dados (idSensor, valor) VALUES (5, ?)',
            //     [chave]
            // );
            }
        })
        }

    });
    arduino.on('error', (mensagem) => {
        console.error(`Erro no arduino (Mensagem: ${mensagem}`)
    });
}

const servidor = (
    valoresDht11Umidade,
    valoresDht11Temperatura,
    valoresLuminosidade,
    valoresLm35Temperatura,
    valoresChave
) => {
    const app = express();
    app.use((request, response, next) => {
        response.header('Access-Control-Allow-Origin', '*');
        response.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
        next();
    });
    app.listen(SERVIDOR_PORTA, () => {
        console.log(`API executada com sucesso na porta ${SERVIDOR_PORTA}`);
    });
    app.get('/sensores/dht11/umidade', (_, response) => {
        return response.json(valoresDht11Umidade);
    });
    app.get('/sensores/dht11/temperatura', (_, response) => {
        return response.json(valoresDht11Temperatura);
    });
    app.get('/sensores/luminosidade', (_, response) => {
        return response.json(valoresLuminosidade);
    });
    app.get('/sensores/lm35/temperatura', (_, response) => {
        return response.json(valoresLm35Temperatura);
    });
    app.get('/sensores/chave', (_, response) => {
        return response.json(valoresChave);
    });
}

(async () => {
    const valoresDht11Umidade = [];
    const valoresDht11Temperatura = [];
    const valoresLuminosidade = [];
    const valoresLm35Temperatura = [];
    const valoresChave = [];
    await serial(
        valoresDht11Umidade,
        valoresDht11Temperatura,
        valoresLuminosidade,
        valoresLm35Temperatura,
        valoresChave
    );
    servidor(
        valoresDht11Umidade,
        valoresDht11Temperatura,
        valoresLuminosidade,
        valoresLm35Temperatura,
        valoresChave
    );
})();
