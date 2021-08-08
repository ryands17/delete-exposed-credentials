import { Handler } from 'aws-lambda'
import { CloudTrail } from 'aws-sdk'
import { Tuple, CloudTrailLookupEvent } from './types'

const cloudTrail = new CloudTrail()

const ONE_DAY = 24 * 60 * 60 * 1000

export const handler: Handler<
  CloudTrailLookupEvent,
  ReturnType<typeof summaryOfEvents>
> = async (event) => {
  try {
    if (!event.deleteAccessKey.username) {
      throw Error()
    }

    let startTime = new Date()
    let endTime = new Date(Date.now() + ONE_DAY)
    let events = await eventsSinceYesterday({
      username: event.deleteAccessKey.username,
      startTime,
      endTime,
    })

    return summaryOfEvents(events)
  } catch (e) {
    console.error(e)
    throw Error(`Couldn't fetch CloudTrailEvents`)
  }
}

interface EventsSinceYesterday {
  username: string
  startTime: Date
  endTime: Date
}

const eventsSinceYesterday = ({
  username,
  startTime,
  endTime,
}: EventsSinceYesterday) => {
  return cloudTrail
    .lookupEvents({
      LookupAttributes: [
        { AttributeKey: 'Username', AttributeValue: username },
      ],
      StartTime: startTime,
      EndTime: endTime,
    })
    .promise()
}

export const summaryOfEvents = (
  events: CloudTrail.Types.LookupEventsResponse
) => {
  let eventNames: Tuple = {}
  let resourceNames: Tuple = {}
  let resourceTypes: Tuple = {}

  events.Events?.forEach((event) => {
    if (event.EventName)
      eventNames[event.EventName] = (eventNames[event.EventName] || 0) + 1

    event.Resources?.forEach((resource) => {
      if (resource.ResourceName)
        resourceNames[resource.ResourceName] =
          (resourceNames[resource.ResourceName] || 0) + 1

      if (resource.ResourceType)
        resourceTypes[resource.ResourceType] =
          (resourceTypes[resource.ResourceType] || 0) + 1
    })
  })

  // send the 10 most common CloudTrail events (desc sorted)
  return {
    eventNames: Object.entries(eventNames)
      .sort((a, b) => b[1] - a[1])
      .slice(10),
    resourceNames: Object.entries(resourceNames)
      .sort((a, b) => b[1] - a[1])
      .slice(10),
    resourceTypes: Object.entries(resourceTypes)
      .sort((a, b) => b[1] - a[1])
      .slice(10),
  }
}
