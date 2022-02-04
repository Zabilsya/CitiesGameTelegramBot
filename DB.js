import mongoose from 'mongoose';

class DB {
    constructor() {
        this.token = process.env.DATABASE_TOKEN

        this.connect()
    }

    connect() {
        mongoose.connect(this.token, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        }, (error) => {
            if (!error) {
                console.log('�������� ����������� � ���� ������!')
            } else {
                console.log('������ ����������� � ���� ������!')
            }
        })
    }
}

export default DB