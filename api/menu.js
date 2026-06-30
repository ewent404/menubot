import { getFallbackMenu } from "../src/menuRepository.js";

export default async function handler(_request, response) {
  response.status(200).json(getFallbackMenu());
}
