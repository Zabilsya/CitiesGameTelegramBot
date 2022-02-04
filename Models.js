import mongoose from 'mongoose'
const { Schema, model } = mongoose

export const User = model('User', new Schema({
    user_id: {
        type: String,
        required: true
    },
    games_count: {
        type: Number,
        require: true
    },
    words_count: {
        type: Number,
        require: true
    }
}))

export const City = model('City', new Schema({
    name: {
        type: String,
        required: true
    },
}))