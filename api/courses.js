const { Router } = require('express')
const { validateAgainstSchema } = require('../lib/validation')
const {
    CourseSchema, 
    getCoursesPage, 
    insertNewCourse,
    getCourseById,
    UpdateOneCourse
} = require('../models/course')

const router = Router()

/*
 * GET /courses - Route to return a paginated list of courses.
 */
router.get('/', async (req, res) => {
    try {
      /*
       * Fetch page info, generate HATEOAS links for surrounding pages and then
       * send response.
       */
      const coursePage = await getCoursesPage(parseInt(req.query.page) || 1)
      coursePage.links = {}
      if (coursePage.page < coursePage.totalPages) {
        coursePage.links.nextPage = `/courses?page=${coursePage.page + 1}`
        coursePage.links.lastPage = `/courses?page=${coursePage.totalPages}`
      }
      if (coursePage.page > 1) {
        coursePage.links.prevPage = `/courses?page=${coursePage.page - 1}`
        coursePage.links.firstPage = '/courses?page=1'
      }
      res.status(200).send(coursePage)
    } catch (err) {
      console.error(err)
      res.status(500).send({
        error: "Error fetching courses list.  Please try again later."
      })
    }
  })

/*
 * POST /courses - Route to create a new courses.
 */
router.post('/', async (req, res) => {
    if (validateAgainstSchema(req.body, CourseSchema)) {
      try {
        const id = await insertNewCourse(req.body)
        res.status(201).send({
          id: id
        })
      } catch (err) {
        console.error(err)
        res.status(500).send({
          error: "Error inserting course into DB.  Please try again later."
        })
      }
    } else {
      res.status(400).send({
        error: "Request body is not a valid course object."
      })
    }
  })

/*
 * GET /courses/{id} - Route to fetch info about a specific course.
 */
router.get('/:id', async (req, res, next) => {
    try {
      const course = await getCourseById(req.params.id)
      if (course) {
        res.status(200).send(course)
      } else {
        next()
      }
    } catch (err) {
      console.error(err)
      res.status(500).send({
        error: "Unable to fetch course.  Please try again later."
      })
    }
  })

/*
 * PATCH /courses/{id} - Update data for a specific Course.
 */
router.put('/:id', async (req, res, next) =>{
    try {
        const course = await UpdateOneCourse(req.params.id, req.body)
        if (course) {
          res.status(200).send(course)
        } else {
          next()
        }
      } catch (err) {
        console.error(err)
        res.status(500).send({
          error: "Unable to update course.  Please try again later."
        })
      }
})


module.exports = router