/* eslint-disable @next/next/no-img-element */
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
    <div className="flex min-h-dvh flex-col bg-base">
      <PageHeader />

      <main className="mx-auto grid w-full max-w-[1200px] flex-1 items-center gap-12 px-[22px] py-14 md:grid-cols-[1fr_400px] md:gap-[88px] md:px-16 md:py-20">
        {/* render, as in the landing story section */}
        <figure className="relative m-0 hidden aspect-square overflow-hidden shadow-[0_22px_44px_rgba(30,25,80,0.22)] md:block">
          <img
            src="/landing/render-lineup-dark.jpg"
            alt="Six white 3D-printed landmark models on a dark table"
            className="h-full w-full object-cover"
          />
          <figcaption className="absolute bottom-0 left-0 bg-paper px-4 py-2.5 font-mono text-[8.5px] uppercase tracking-[0.16em] text-ink">
            The launch lineup
          </figcaption>
        </figure>

        <div className="w-full">
          <div className="fb-eyebrow mb-6">The Studio</div>
          <h1 className="fb-display m-0 text-[clamp(44px,6vw,64px)] text-ink">
            Welcome
            <br />
            back.
          </h1>
          <p className="m-0 mb-10 mt-6 max-w-[360px] text-[14px] font-light leading-[1.45] text-[#5d5758]">
            Sign in to open the Studio and your backer downloads. Already a FrameCity backer? Use the same
            account.
          </p>

          <LoginForm next={next} hadError={params.error === "auth"} />
        </div>
      </main>
    </div>
  );
}
