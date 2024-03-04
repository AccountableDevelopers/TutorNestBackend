const express = require("express")
const bcrypt = require("bcryptjs")
const bodyParser = require("body-parser")
const User = require("../models/Student")

const app = express();

app.use(bodyParser.json())

const createNewPassword = async (payload) => {
    const { newPassword } = payload;

    try {
        const foundStudent = await User.findById({ _id: payload._id })

        if (!foundStudent) return "No user with provided id";

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        //update the students password
        foundStudent.password = hashedPassword;

        await foundStudent.save();

        return "Password changed successfully!";

    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports = { createNewPassword }