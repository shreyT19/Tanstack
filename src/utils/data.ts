import { faker } from '@faker-js/faker'

export interface Person {
  customerID: string
  userName: string
  phoneNumber: string
  description: string
  emailId: string
  birthDate: Date
}

export function generatePerson(): Person {
  return {
    customerID: faker.datatype.uuid(),
    userName: faker.internet.userName(),
    phoneNumber: faker.phone.number(),
    description: faker.lorem.sentence(),
    emailId: faker.internet.email(),
    birthDate: faker.date.birthdate()
  }
}

export const USERS: Person[] = faker.helpers.multiple(generatePerson, {
  count: 10
})
