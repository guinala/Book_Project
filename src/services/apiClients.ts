import axios from "axios";

export const openLibraryClient = axios.create({
  baseURL: "https://openlibrary.org",
  headers: { "Content-Type": "application/json" },
});

export const googleBooksClient = axios.create({
  baseURL: "https://www.googleapis.com/books/v1",
  headers: { "Content-Type": "application/json" },
});
