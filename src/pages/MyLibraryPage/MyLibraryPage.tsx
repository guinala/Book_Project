import CurrentReadingCard from "../../components/CurrentReadingCard/CurrentReadingCard"
import "./MyLibraryPage.scss";

function MyLibraryPage() {
  return (
    <section className="my-library">
      <h2 className="my-library__heading">Estoy leyendo...</h2>

      <div className="my-library__reading-section">
        <CurrentReadingCard />
      </div>
    </section>
  );
}

export default MyLibraryPage;