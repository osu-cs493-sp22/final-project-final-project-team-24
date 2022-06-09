const { Router } = require('express')
const { validateAgainstSchema } = require('../lib/validation')
const {
    AssignmentSchema,
    insertNewAssignment,
    getAssignmentById,
    UpdateOneAssignment,
    DeleteOneAssignment
} = require('../models/assignment')

const router = Router()


/*
 * POST /assignments - Route to create a new assignment.
 */
router.post('/', async (req, res) => {
    if (validateAgainstSchema(req.body, AssignmentSchema)) {
        try {
            const id = await insertNewAssignment(req.body)
            res.status(201).send({
                id: id
            })
        } catch (err) {
            console.error(err)
            res.status(500).send({
                error: "Error inserting assignment into DB.  Please try again later."
            })
        }
    } else {
        res.status(400).send({
            error: "Request body is not a valid assignment object."
        })
    }
})

/*
 * GET /assignments/{id} - Route to fetch data about a specific assignment.
 */
router.get('/:id', async (req, res, next) => {
    try {
        const assignment = await getAssignmentById(req.params.id)
        if (assignment) {
            res.status(200).send(assignment)
        } else {
            next()
        }
    } catch (err) {
        console.error(err)
        res.status(500).send({
            error: "Unable to fetch assignment.  Please try again later."
        })
    }
})

/*
 * PATCH /assignments/{id} - Update data for a specific Assignment.
 */
router.patch('/:id', async (req, res, next) =>{
    try {
        const assignment = await UpdateOneAssignment(req.params.id, req.body)
        if (assignment) {
            res.status(200).send(assignment)
        } else {
            next()
        }
    } catch (err) {
        console.error(err)
        res.status(500).send({
            error: "Unable to update assignment.  Please try again later."
        })
    }
})

/*
 * DELETE /assignments/{id} - Remove a specific Assignment from the database.
 */
router.delete('/:id', async (req, res, next) =>{
    try {
        const assignment = await DeleteOneAssignment(req.params.id)
        if (assignment) {
            res.status(200).send(assignment)
        } else {
            next()
        }
    } catch (err) {
        console.error(err)
        res.status(500).send({
            error: "Unable to delete assignment.  Please try again later."
        })
    }
})

module.exports = router