import App from "@/App";
import LandingPage from "@/pages/landing/LandingPage";
import AuthPage from "@/pages/auth/AuthPage";
import ExplorePage from "@/pages/explore/ExplorePage";
import ExploreSectionPage from "@/pages/explore/section/ExploreSectionPage";
import MyLibraryPage from "@/pages/my-library/MyLibraryPage";
import FullShelfPage from "@/pages/my-library/shelf/FullShelfPage";
import BookDetailPage from "@/pages/book-detail/BookDetailPage";
import CommunityPage from "@/pages/community/CommunityPage";
import ProfilePage from "@/pages/profile/ProfilePage";
import EditProfilePage from "@/pages/edit-profile/EditProfilePage";
import AuthRoute from "@/routes/AuthRoute";

export const ROUTES = [
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: "auth", element: <AuthPage /> },
      { path: "explore", element: <ExplorePage /> },
      { path: "explore/section/:type", element: <ExploreSectionPage /> },
      { path: "books/:bookId", element: <BookDetailPage /> },
      { path: "community", element: <CommunityPage /> },
      {
        path: "my-library",
        element: (
          <AuthRoute requireAuth>
            <MyLibraryPage />
          </AuthRoute>
        ),
      },
      {
        path: "my-library/shelf",
        element: (
          <AuthRoute requireAuth>
            <FullShelfPage />
          </AuthRoute>
        ),
      },
      {
        path: "profile",
        element: (
          <AuthRoute requireAuth>
            <ProfilePage />
          </AuthRoute>
        ),
      },
      {
        path: "profile/edit",
        element: (
          <AuthRoute requireAuth>
            <EditProfilePage />
          </AuthRoute>
        ),
      },
      {
        path: "profile/:userId",
        element: <ProfilePage />,
      },
      {
        path: "u/:username",
        element: <ProfilePage />,
      },
    ],
  },
];

export const NAV_LINKS = [
  { path: "/my-library", label: "nav.myLibrary" },
  { path: "/explore", label: "nav.explore" },
  { path: "/community", label: "nav.community" },
];