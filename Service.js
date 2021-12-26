import mongoose from 'mongoose'
import axios from 'axios';
import csv from 'csv-parser'
import fs from 'fs'
import Model from './Model.js'

class Service {

    constructor() {
        this.token = process.env.DATABASE_TOKEN
        this.apiCityUrl = 'https://nominatim.openstreetmap.org/search/'
        this.apiCityParams = '?format=json&addressdetails=1&limit=1&accept-language=ru&extratags=1'
        this.redundantLetters = ['ь', 'ъ', 'ы']
        this.currentGames = []
        this.currentLetter = {}
        this.usedWords = {}

        this.connectToDB()
    }

    connectToDB() {
        mongoose.connect(this.token, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        }, (error) => {
            if (!error) {
                console.log('Успешное подключение к базе данных!')
            } else {
                console.log('Ошибка подключения к базе данных!')
            }
        })
    }

    async getAnswer(chatId, text) {
        try {
            const checkInputCommands = await this.checkInputCommands(chatId, text)
            if (checkInputCommands) {
                return checkInputCommands
            }

            this.checkExistingData(chatId)
            const city = text.toLowerCase()
            const checkInputCity = this.checkInputCity(chatId, city)
            if (checkInputCity) {
                return checkInputCity
            }

            const response = await Model.findOne({name: {$regex: this.getRegex(`^${city}$`)}})

            if (response) {
                const name = response.name.toLowerCase()
                this.usedWords[chatId].push(name)
                const reverseName = name.split('').reverse().join('')

                // бот отправляет свой город
                for (let char of reverseName) {
                    if (!this.redundantLetters.includes(char)) {
                        return await this.findAndSendNewCity(chatId, char)
                    }
                }
            }
            return 'Такого города нет! Введите другой'

        } catch (e) {
            console.log(e)
        }
    }

    async findAndSendNewCity(chatId, char) {
        let cities = await Model.find({name: {$nin: this.usedWords[chatId], $regex: this.getRegex(`^${char}`)}})
        if (cities && cities.length > 0) {
            const numbersOfCities = cities.length
            const randomNumber = Math.floor(Math.random() * numbersOfCities)
            const cityName = cities[randomNumber].name
            const reverseCityName = cityName.split('').reverse().join('')
            for (let char of reverseCityName) {
                if (!this.redundantLetters.includes(char)) {
                    const remainCities = await Model.find({name: {$nin: this.usedWords[chatId], $regex: this.getRegex(`^${char}`)}})
                    if (remainCities && remainCities.length === 0) {
                        this.currentGames = this.currentGames.filter(game => game !== chatId)
                        this.resetData(chatId)
                        return `${cityName}\nВы проиграли! Города на букву '${char.toUpperCase()}' закончились\nЧтобы начать новую игру, введите команду /go`
                    }
                    this.usedWords[chatId].push(cityName.toLowerCase())
                    this.currentLetter[chatId] = char
                    return cityName
                }
            }
        }
        this.currentGames = this.currentGames.filter(game => game !== chatId)
        this.resetData(chatId)
        return `Вы выиграли! Города на букву '${char.toUpperCase()}' закончились\nЧтобы начать новую игру, введите команду /start`
    }

    checkInputCity(chatId, city) {
        if (this.currentLetter[chatId] && this.currentLetter[chatId] !== city.charAt(0)) {
            return `Вам нужно ввести город на букву '${this.currentLetter[chatId].toUpperCase()}'`
        }
        if (this.usedWords[chatId].includes(city)) {
            return 'Этот город уже был!'
        }

        return false
    }

    async checkInputCommands(chatId, text) {
        let result
        if (this.currentGames.includes(chatId)) {
            result = await this.checkGameCommands(chatId, text)
        } else {
            result = this.checkOutGameCommands(chatId, text)
        }

        return result
    }

    async checkGameCommands(chatId, text) {
        let result = false
        switch (text) {
            case '/go':
                this.currentGames.push(chatId)
                result = 'Хотите начать игру заного? Введите команду /restart'
                break
            case '/restart':
                this.resetData(chatId)
                result = 'Давай по новой:) Первый город?'
                break
            case '/stop':
                this.currentGames = this.currentGames.filter(game => game !== chatId)
                this.resetData(chatId)
                result = 'Я ушел отдохнуть... Зови, как будешь свободен'
                break
            case '/words':
                if (this.usedWords[chatId] && this.usedWords[chatId].length > 0) {
                    let words = 'Список использованных городов:'
                    let arrWords = [...this.usedWords[chatId]]
                    arrWords.sort().forEach((word, index) => words += `\n${index + 1}.  ${this.capitalizeCity(word)}`)
                    result = words
                } else {
                    result = 'Еще ни одного города не было упомянуто!'
                }
                break
            case '/city':
                let message = ''
                if (this.usedWords[chatId]) {
                    const numberOfWords = this.usedWords[chatId].length
                    const info = await this.getCityInfo(this.usedWords[chatId][numberOfWords - 1])
                    if (typeof info === 'object') {
                        Object.keys(info).forEach(key => {
                            message += `\n${info[key]}`
                        })
                    } else {
                        message = info
                    }
                } else {
                    message = 'Еще ни одного города не было упомянуто!'
                }
                result = message
                break
            case '/watch':
                let commands = 'Доступные команды:'
                this.getCommands(true).forEach(command => commands += `\n${command.command} - ${command.description}`)
                result = commands
                break
            case '':
                result = 'Введите город или доступную команду! Список доступных команд /watch'
        }

        return result
    }

    checkOutGameCommands(chatId, text) {
        let result
        switch (text) {
            case '/start':
                this.resetData(chatId)
                result = 'Приветствую тебя в игре "Города"!\n/go - Начать игру \n/watch - Список доступных команд'
                break
            case '/go':
                this.currentGames.push(chatId)
                this.resetData(chatId)
                result = 'Да начнется игра! Скажи свой первый город'
                break
            case '/info':
                result = 'пока пусто'
                break
            case '/watch':
                let commands = 'Доступные команды:'
                this.getCommands(false).forEach(command => commands += `\n${command.command} - ${command.description}`)
                result = commands
                break
            default:
                result = 'Неизвестная команда. Список доступных команд /watch'
        }

        return result
    }

    async getCityInfo(city) {
        const { data } = await axios.get(this.apiCityUrl + encodeURIComponent(city) + this.apiCityParams)
        if (data && data.length) {
            const { address, extratags, lat, lon } = data.shift()
            const { city: cityName, country } = address

            if (cityName && cityName.toLowerCase() !== city) {
                return 'Не удалось получить информацию по городу ' + this.capitalizeCity(city)
            }

            return {
                city: `Город: ${cityName || this.capitalizeCity(city)}`,
                country: `Страна: ${country || 'Неизвестно'}`,
                population: `Население: ${extratags.population ? Number(extratags.population).toLocaleString('ru-RU') : 'Неизвестно'}`,
                lat: `Широта: ${lat || 'Неизвестно'}`,
                lon: `Долгота: ${lon || 'Неизвестно'}`
            }
        }

        return 'Не удалось получить информацию по городу ' + this.capitalizeCity(city)
    }

    checkExistingData(chatId) {
        if (!this.currentLetter.hasOwnProperty(chatId)) {
            this.currentLetter[chatId] = ''
            this.usedWords[chatId] = []
        }
    }

    getRegex(rule) {
        return new RegExp(rule, 'i');
    }

    resetData(chatId) {
        delete this.currentLetter[chatId]
        delete this.usedWords[chatId]
    }


    capitalizeCity(city) {
        return city.charAt(0).toUpperCase() + city.slice(1)
    }

    getCommands(state) {
        if (state) {
            return [
                {
                    command: '/restart',
                    description: 'Перезапустить игру'
                },
                {
                    command: '/stop',
                    description: 'Закончить игру'
                },
                {
                    command: '/words',
                    description: 'Использованные слова'
                },
                {
                    command: '/city',
                    description: 'Получить информацию о последнем городе'
                }
            ]
        }
        return [
            {
                command: '/go',
                description: 'Новая игра'
            },
            {
                command: '/info',
                description: 'Профиль'
            }
        ]
    }


    // функция для записи информации из csv в базу данных
    async writeToDB(data) {
        for (let i = 0; i < data.length; i++) {
            const city = new Model({
                name: data[i]
            })
            await city.save()
        }
    }

    // функция для чтения csv
    convertData() {
        const key = 'city_id";"country_id";"region_id";"name'
        const results = []
        fs.createReadStream('data.csv', { encoding: 'utf-8' })
            .pipe(csv())
            .on('data', data => {
                const value = data[key].split(';').pop().replace('"', '')
                return results.push(value)
            })
            .on('end', async () => {
                await this.connectToDB()
                await this.writeToDB(results)
            });
    }
}

export default Service