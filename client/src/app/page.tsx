import Link from "next/link";

export default function Home() {
  const categories = [
    { icon: "🌱", name: "Environment", value: "Environment" },
    { icon: "📚", name: "Education", value: "Education" },
    { icon: "❤️", name: "Health", value: "Health" },
    { icon: "🐾", name: "Animals", value: "Animals" },
  ];

  return (
    <main className="min-h-[calc(100vh-80px)] bg-white">
      {/* Hero */}
      <section className="relative left-1/2 min-h-0 w-screen -translate-x-1/2 overflow-hidden bg-none bg-white px-6 py-16 text-center md:min-h-0" style={{ backgroundImage: "none", backgroundColor: "#ffffff" }}>
        <h1 className="mx-auto max-w-3xl text-5xl font-bold leading-tight tracking-tight text-gray-900 md:text-6xl">
          Connect with people.
          Help your community.
          Change lives.
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-gray-500">
          Together, we can create a positive impact.
        </p>

        <Link
          href="/explore"
          className="mt-8 inline-flex items-center rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          Explore 
        </Link>
      </section>

      {/* Categories */}
      <section className="relative z-10 mx-auto mt-8 max-w-4xl px-6 pb-20">
        <h2 className="mb-8 text-center text-xl font-semibold text-gray-900">
          What do you care about?
        </h2>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.name}
              href={`/explore?category=${encodeURIComponent(category.value)}`}
              className="group rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center transition hover:-translate-y-1 hover:border-blue-200 hover:bg-blue-50"
            >
              <div className="text-4xl">{category.icon}</div>

              <div className="mt-3 text-sm font-semibold text-gray-700 group-hover:text-blue-600">
                {category.name}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}




