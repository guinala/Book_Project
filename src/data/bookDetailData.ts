import type { BookDetail } from "@/types/BookDetail";
import bookCover from "@/assets/el-nombre-del-viento.jpg";
import recCover1 from "@/assets/covers/shelf-1.jpg";
import recCover2 from "@/assets/covers/shelf-2.jpg";
import recCover3 from "@/assets/covers/shelf-3.jpg";
import authorCover1 from "@/assets/covers/shelf-4.jpg";
import authorCover2 from "@/assets/covers/shelf-5.jpeg";
import authorCover3 from "@/assets/covers/shelf-3.jpg";

const NOMBRE_DEL_VIENTO: BookDetail = {
  key: "el-nombre-del-viento",
  cover_url: bookCover,
  genre: "Fantasía",
  title: "El nombre del viento",
  author: "Patrick Rothfuss",
  rating: 4.7,
  reviewCount: 10945,
  pages: 662,
  year: 2007,
  isbn: "978-84-9800-296-2",
  synopsis:
    "En una posada en tierra de nadie, un hombre se dispone a relatar, por primera vez, la auténtica historia de su vida. Una historia que únicamente él conoce y que ha quedado diluida tras los rumores, las conjeturas y los cuentos de taberna que le han convertido en un personaje legendario a quien todos daban ya por muerto: Kvothe, músico, mendigo, ladrón, estudiante, mago, héroe y asesino.\n\nAhora va a revelar la verdad sobre sí mismo. Y para ello debe empezar por el principio: su infancia en una troupe de artistas itinerantes, los años malviviendo como un ladronzuelo en las calles de Tarbean y su etapa como estudiante en la Universidad.",
  reviews: [
    {
      id: "review-1",
      name: "Andrea Ruiz",
      handle: "@andrea_r03",
      date: "hace 2 días",
      rating: 4,
      text: "Es una pasada, una auténtica obra maestra. Lo volvería a leer mil veces. Es sin duda una lectura imprescindible!!",
      likes: 20,
      comments: 1,
    },
    {
      id: "review-2",
      name: "Carlos Méndez",
      handle: "@carlosmendez",
      date: "hace 5 días",
      rating: 5,
      text: "Increíble construcción del mundo y los personajes. Rothfuss tiene una prosa magistral. Sin duda uno de los mejores libros de fantasía que he leído.",
      likes: 35,
      comments: 4,
    },
    {
      id: "review-3",
      name: "María García",
      handle: "@mariagarcia",
      date: "hace 1 semana",
      rating: 4,
      text: "Una historia que te atrapa desde la primera página. Kvothe es un personaje fascinante y el mundo está lleno de detalles únicos.",
      likes: 12,
      comments: 2,
    },
  ],
  authorInfo: {
    name: "Patrick Rothfuss",
    photoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Patrick-rothfuss-2014-kyle-cassidy.jpg/500px-Patrick-rothfuss-2014-kyle-cassidy.jpg",
    bio: "Patrick James Rothfuss (Madison, 6 de junio de 1973) es un escritor estadounidense de fantasía y profesor adjunto de literatura y filología inglesa de la Universidad de Wisconsin. Es el autor de la serie Crónica del asesino de reyes, que fue rechazada por varias editoriales antes de que el primer libro de la serie El nombre del viento fuese publicado en el año 2007.",
    books: [
      { id: "a1", cover_url: authorCover1, title: "El Temor de un Hombre Sabio", year: "2011" },
      { id: "a2", cover_url: authorCover2, title: "El Estrecho Sendero Entre Deseos", year: "2023" },
      { id: "a3", cover_url: authorCover3, title: "La Música del Silencio", year: "1999" },
    ],
  },
  recommendations: [
    {
      key: "rec-1",
      title: "El hobbit",
      authors: ["J.R.R. Tolkien"],
      first_publish_year: 1937,
      cover_id: null,
      cover_url: recCover1,
      edition_count: 0,
      genre: "Fantasía",
      rating: 4.6,
      ratingCount: 3100,
    },
    {
      key: "rec-2",
      title: "Harry Potter y la piedra filosofal",
      authors: ["J.K. Rowling"],
      first_publish_year: 1997,
      cover_id: null,
      cover_url: recCover2,
      edition_count: 0,
      genre: "Fantasía",
      rating: 4.8,
      ratingCount: 15000,
    },
    {
      key: "rec-3",
      title: "1984",
      authors: ["George Orwell"],
      first_publish_year: 1949,
      cover_id: null,
      cover_url: recCover3,
      edition_count: 0,
      genre: "Distopía",
      rating: 4.7,
      ratingCount: 8200,
    },
  ],
};


const BOOK_DETAIL_MAP: Record<string, BookDetail> = {
  [NOMBRE_DEL_VIENTO.key]: NOMBRE_DEL_VIENTO,
};


//Aquí se debería utilizar firebase, por ahora el contenido obtenido es estático
export function getBookDetailById(id: string): BookDetail | null {
  return BOOK_DETAIL_MAP[id] ?? NOMBRE_DEL_VIENTO;
}
