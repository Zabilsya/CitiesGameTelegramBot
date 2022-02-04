import DB from './DB.js'
import Service from './Service.js'
import TelegramApi from 'node-telegram-bot-api'

class Bot {

    constructor() {
        this.token = process.env.TELEGRAM_TOKEN
        new DB()
        this.serviceCity = new Service()
        this.api = new TelegramApi(this.token, {polling: true})

        this.hangEvents()
    }

    hangEvents() {
        this.api.setMyCommands(this.setCommands())

        this.api.on('message', async message => {
            console.log(message)
            const answer = await this.serviceCity.getAnswer(message)
            await this.api.sendMessage(message.chat.id, answer)
        })
    }

    setCommands() {
        return [{command: '/watch', description: 'Список доступных команд'}]
    }
}

export default Bot