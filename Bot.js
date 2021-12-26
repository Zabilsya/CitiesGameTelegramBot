import Service from './Service.js'
import TelegramApi from 'node-telegram-bot-api'

class Bot {

    constructor() {
        this.token = process.env.TELEGRAM_TOKEN
        this.service = new Service()
        this.api = new TelegramApi(this.token, {polling: true})

        this.hangEvents()
    }

    hangEvents() {
        this.api.setMyCommands(this.setCommands())

        this.api.on('message', async message => {
            const { text, chat } = message
            const answer = await this.service.getAnswer(chat.id, text)
            await this.api.sendMessage(chat.id, answer)
        })
    }

    setCommands() {
        return [{command: '/watch', description: 'Список доступных команд'}]
    }
}

export default Bot