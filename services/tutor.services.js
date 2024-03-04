const express = require("express")
const bcrypt = require("bcryptjs")
const bodyParser = require("body-parser")
const User = require("../models/Tutor")

const app = express();

app.use(bodyParser.json())


const createNewPassword = async () => {
    const { newPassword } = payload;

    try {
        const foundTutor = await Users.findById({ _id: payload._id })

        if (!foundTutor) return "No user with provided id";

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        //update the tutors password
        foundTutor.password = hashedPassword;

        await foundTutor.save();

        console.log("Password changed successfully!");

    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports = { createNewPassword }