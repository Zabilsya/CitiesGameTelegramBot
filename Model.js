import mongoose from 'mongoose'
const { Schema, model } = mongoose

const Model = model('City', new Schema({
    name: {
        type: String,
        required: true
    },
}))

export default Model