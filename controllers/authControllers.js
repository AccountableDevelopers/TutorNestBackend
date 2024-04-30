
const { BadUserRequestError, NotFoundError, UnAuthorizedError, FailedRequestError } = require("../utils/errorHandlers.js")
const StudentUser = require("../models/Student.js")
const TutorUser = require("../models/Tutor.js")
const bcrypt = require("bcrypt")
require("dotenv").config()
const sendEmail = require("../services/nodemailer.js")
const { accessToken, refreshToken } = require("../utils/helpers.js")



class UserController {

    static async createStudent(req, res ) {
      const { name, email, password } = req.body;
      // Confirm  email has not been used by another user
      const existingUser = await StudentUser.findOne({ email });
      if (existingUser) {
      if (existingUser.isVerified) {
      throw new BadUserRequestError(`An account with ${email} already exists.`);
      } else if (existingUser.verifyEmailTokenExpire < Date.now()) {
      // Remove the existing user if the verification token has expired
      await StudentUser.deleteOne({ _id: existingUser._id });
      throw new BadUserRequestError('An error occured. Please try signing up again.')
      } else {
      throw new BadUserRequestError(`Please log in to ${email} to get your verification link.`);
      }
    }
      // Generate verification token
      const saltRounds = parseInt(process.env.bycrypt_salt_round)
      // Create verification token
      const verifyEmailToken = Math.floor(100000 + Math.random() * 900000).toString();                                                                                                                                                                                                                         Math.floor(100000 + Math.random() * 900000).toString();
      // Hash password
      const hashedPassword =  await bcrypt.hash(password, 10);
      const user = new StudentUser ({
      name,
      email,
      password: hashedPassword,
      verifyEmailToken,
      verifyEmailTokenExpire: Date.now() + parseInt(process.env.token_expiry),
      });
     await user.save()
       // Set body of email
      const message = `Hi ${name}, Your verification code is: ${verifyEmailToken}` 
      const mailSent = await sendEmail({
          email: user.email,
          subject: 'Email verification',
          message
        })  
        if(mailSent === false) throw new NotFoundError(`${email} cannot be verified. Please provide a valid email address`)
        res.status(200).json({
          status: 'Success',
          message: `An email verification link has been sent to ${email}.`,
          message
        })
    }
    

    
    static async createTutor(req, res ) {
      const { name, email, password } = req.body;
      // Confirm  email has not been used by another user
      const existingUser = await TutorUser.findOne({ email });
      if (existingUser) {
      if (existingUser.isVerified) {
      throw new BadUserRequestError(`An account with ${email} already exists.`);
      } else if (existingUser.verifyEmailTokenExpire < Date.now()) {
      // Remove the existing user if the verification token has expired
      await TutorUser.deleteOne({ _id: existingUser._id });
      throw new BadUserRequestError('An error occured. Please try signing up again.')
      } else {
      throw new BadUserRequestError(`Please log in to ${email} to get your verification link.`);
      }
    }
      // Generate verification token
      const saltRounds = parseInt(process.env.bycrypt_salt_round)
      // Create verification token
      const verifyEmailToken = Math.floor(100000 + Math.random() * 900000).toString();
      // Hash password
      const hashedPassword =  await bcrypt.hash(password, 10);
      const user = new TutorUser ({
      name,
      email,
      password: hashedPassword,
      verifyEmailToken,
      verifyEmailTokenExpire: Date.now() + parseInt(process.env.token_expiry),
      });
     await user.save()
       // Set body of email
      const message = `Hi ${name}, Your verification code is: ${verifyEmailToken}` 
      const mailSent = await sendEmail({
          email: user.email,
          subject: 'Email verification',
          message
        })  
        if(mailSent === false) throw new NotFoundError(`${email} cannot be verified. Please provide a valid email address`)
        res.status(200).json({
          status: 'Success',
          message: `An email verification link has been sent to ${email}.`,
          message
        })
    }

    static async login (req,res){
      const {email,password} = req.body
      console.log("here")
      const user = await StudentUser.findOne({email})
      if(!user) throw new NotFoundError("Email not found")
      if(user.isVerified === false) throw new UnAuthorizedError("You have not been verified")
      const isMatch = await bcrypt.compare(password,user.password)
      if(!isMatch) throw new UnAuthorizedError("Incorrect password")
      const token = accessToken(user)
      const refreshToken = refreshToken(user)
      user.refreshToken =  refreshToken
      res.cookie("refreshToken",refreshToken,{httpOnly: true})
      res.status(201).json({accessToken:token})
    }


    static async verifyOtp (req,res) {
      const {otpCode,email} = req.body
      const user = await StudentUser.findOne({email})
      if(!user) throw new NotFoundError("otp not found, please otp")
      if(user.verifyEmailToken == otpCode.toString() && user.verifyEmailTokenExpire > new Date(Date.now())){
        user.isVerified = true;
        user.verifyEmailToken = undefined;
        user.verifyEmailTokenExpire = undefined
        await user.save()
      }else{
        throw new UnAuthorizedError("Otp code has expired")
      }
      res.status(200).json("Email has been verified")
    }

    static async resetOtpCode (req,res){
      const {email} = req.body
      const user = await StudentUser.findOne({email})
      if(!user) return NotFoundError(`user with ${email} not found`)
      const verifyEmailToken = Math.floor(Math.random()*90000).toString()
      const message = `your new verification code is ${verifyEmailToken}`
      const mailSent = await sendEmail({
        email,
        subject:"new otp code",
        message
      })
      user.verifyEmailToken = verifyEmailToken;
      user.verifyEmailTokenExpire = Date.now() + parseInt(process.env.token_expiry)
      user.save()
      if(mailSent === false) return FailedRequestError("failed to send mail message")
      res.status(201).json({
    message:"sucess",
    data:`your otp code is: ${verifyEmailToken}`
    })
    }

    static async resetPassword (req,res){
      const {email} = req.body
      const user = await StudentUser.findOne({email})
      if(!user) return NotFoundError(`${email} not found`)
      if(!user.isVerified) return UnAuthorizedError("user not verified, verify with otp")
      const message = `<p>Please use this link to verify and complete your log in</p>
                        <p>This link <b>expires in 30 minutes</b></p>
                        <p>press <a href="${process.env.CLIENT_URL}">here</a></p> `
      const mailSent = await sendEmail({
        email,
        subject:"Password Reset Link",
        message
      })
      if(mailSent === false) return FailedRequestError("failed to send mail")
      res.status(201).json({
        "sucesss": true,
        data:mailSent
    })
    }

    static async createNewPassword (req,res){
      const {email,oldPassword,newPassword} = req.body
      const user = await StudentUser.findOne({email})
      if(!user) return NotFoundError(`${email} not found`)
      if(!user.isVerified) return UnAuthorizedError("Please complete log in by verifying")
      const isMatch = await bcrypt.compare(oldPassword,user.password)
      if(!isMatch) return UnAuthorizedError("Incorrect password")
      const hashNewPassword = await bcrypt.hash(newPassword, 10)
      user.password = hashNewPassword
      user.save()
      const {password,...others} = user._doc
      res.status(200).json({
        sucess:"true",
        data:others
      })
    }
}
    
  module.exports = UserController