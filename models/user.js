const { ObjectId, GridFSBucket } = require('mongodb');

const { getDbReference } = require('../lib/mongo')
const { extractValidFields } = require('../lib/validation')
const bcrypt = require('bcryptjs')
const { generateAuthToken, requireAuthentication } = require('../lib/auth')

const UserSchema = {
    name: { required: true },
    email: { required: true },
    password: { required: true },
    role: { required: true }
}

exports.UserSchema = UserSchema


async function bulkInsertNewUsers(users) {
    const usersToInsert = users.map(function (user) {
        let u = extractValidFields(user, UserSchema)
        u.password = bcrypt.hashSync(u.password, 8)
        return u
    })
    const db = getDbReference()
    const collection = db.collection('users')
    const result = await collection.insertMany(usersToInsert)
    return result.insertedIds
}
exports.bulkInsertNewUsers = bulkInsertNewUsers

/*
 * Create and store a new application User with specified data and 
 * adds it to the application's database. Only an authenticated User 
 * with 'admin' role can create users with the 'admin' or 'instructor' roles.
 */
async function insertNewUser(user) {
    const userToInsert = extractValidFields(user, UserSchema)
    userToInsert.password = await bcrypt.hash(userToInsert.password, 8)
    console.log("== Hashed, salted password:", userToInsert.password)
    const db = getDbReference()
    const collection = db.collection('users')
    const result = await collection.insertOne(userToInsert)
    return result.insertedId
}
exports.insertNewUser = insertNewUser

/*
 * fetch the user entry corresponding to the user ID
 * specified in the request body.
 */
async function getUserById(id) {
    const db = getDbReference()
    const collection = db.collection('users')
    if (!ObjectId.isValid(id)) {
        return null
    } else {
        const results = await collection
            .find({ _id: new ObjectId(id) })
            .project( { _id: 0, password: 0 } )
            .toArray()
        return results[0]
    }
}
exports.getUserById = getUserById


async function getUserByEmail(email) {
    const db = getDbReference()
    const collection = db.collection('users')

    const results = await collection
        .find({ email: email })
        .toArray()
    return results[0]
}
exports.getUserByEmail = getUserByEmail
