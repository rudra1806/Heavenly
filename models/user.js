const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose').default;

const UserSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    }
});

UserSchema.plugin(passportLocalMongoose); // This adds username and password fields, along with authentication methods

module.exports = mongoose.model('User', UserSchema);