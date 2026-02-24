import Navbar from "./components/Navbar";
import SearchBar from "./components/SearchBar";
import Footer from "./components/Footer";
import BookList from "./components/BookList_Google"
import './LandingPage.css'

function LandingPage() {
  const handleSearch = (query: string, filter: string) => {
  };

  return (
    <>
      <Navbar />
      <main>
        <SearchBar onSearch={handleSearch} variant="hero" />
        <BookList />
      </main>
      <Footer />
    </>
  );
}

export default LandingPage
