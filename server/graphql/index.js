import raven from 'raven'
import express from 'express'
import graphqlHTTP from 'express-graphql'
import cors from 'cors'

import {formatServerError} from 'src/server/util'

import rootSchema from './rootSchema'

const config = require('src/config')

const sentry = new raven.Client(config.server.sentryDSN)
const app = new express.Router()

const corsOptions = {
  origin: [
    /\.learnersguild.org/,
    /\.learnersguild.meh/,
  ],
  exposedHeaders: ['LearnersGuild-JWT'],
}

app.use('/graphql', cors(corsOptions), graphqlHTTP(req => ({
  schema: rootSchema,
  rootValue: {currentUser: req.user},
  pretty: true,
  formatError: error => {
    const serverError = formatServerError(error)

    let originalError
    if (serverError.originalError) {
      originalError = serverError.originalError
      delete serverError.originalError
    } else {
      originalError = serverError
    }

    if (serverError.statusCode >= 500) {
      sentry.captureException(originalError)

      console.error(`${serverError.name || 'UNHANDLED GRAPHQL ERROR'}:
        ${config.server.secure ? serverError.toString() : originalError.stack}`)
    }

    return serverError
  },
})))

export default app
