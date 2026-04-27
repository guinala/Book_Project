import App from "@/App";
import LandingPage from "@/pages/LandingPage/LandingPage";
import AuthPage from "@/pages/AuthPage/AuthPage";
import ExplorePage from "@/pages/ExplorePage/ExplorePage";
import MyLibraryPage from "@/pages/MyLibraryPage/MyLibraryPage";
import BookDetailPage from "@/pages/BookDetailPage/BookDetailPage";
import CommunityPage from "@/pages/CommunityPage/CommunityPage";
import ProfilePage from "@/pages/ProfilePage/ProfilePage";
import EditProfilePage from "@/pages/EditProfilePage/EditProfilePage";
import AuthRoute from "@/routes/AuthRoute";

export const ROUTES = [
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: "auth", element: <AuthPage /> },
      { path: "explore", element: <ExplorePage /> },
      { path: "book/:id", element: <BookDetailPage /> },
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
    ],
  },
];

export const NAV_LINKS = [
  { path: "/my-library", label: "nav.myLibrary" },
  { path: "/explore", label: "nav.explore" },
  { path: "/community", label: "nav.community" },
];