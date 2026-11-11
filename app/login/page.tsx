import "./login.css";
import { landmarkIsland } from "../../components/landing/landmarks";
import { LoginForm } from "../../components/LoginForm";
import { PageHeader } from "../../components/PageHeader";


export const metadata = {
  title: "Sign in — FrameBuilding",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") ? params.next : "/studio";

  return (
    <div className="fbl">
      {/* isometric landmark island, drawn in SVG */}
      <div className="fbl-city" aria-hidden="true" dangerouslySetInnerHTML={{ __html: landmarkIsland() }} />

      <PageHeader tone="sky" />

      <main className="fbl-main">
        <h1 className="fb-display fbl-title fbl-in">Welcome back.</h1>
        <p className="fbl-lead fbl-in">
          Sign in to open the Studio and your backer downloads. Already a FrameCity backer? Use the same
          account.
        </p>

        <div className="fbl-card fbl-in">
          <LoginForm next={next} hadError={params.error === "auth"} compact />
        </div>
      </main>
    </div>
  );
}
