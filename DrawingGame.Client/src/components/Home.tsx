import Button from "./Button";
import Input from "./Input";

type HomeProps = {
  setScreen: React.Dispatch<React.SetStateAction<"Home" | "Game">>;
};

export default function Home({ setScreen }: HomeProps) {
  return (
    <main className="grid h-screen grid-cols-12 grid-rows-11 gap-2 p-2 bg-base-200">
      <section className="col-start-6 col-span-2 row-start-5 content-center text-center">
        <Input placeholder="input name" />
      </section>
      <section className="col-start-6 col-span-1 row-start-6 content-center text-center">
        <Button type="CreateRoom" />
      </section>
      <section className="col-start-7 col-span-1 row-start-6 content-center text-center">
        <Button type="JoinRoom" />
      </section>
    </main>
  );
}
