import Link from "next/link";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function ArrowIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg {...iconProps} className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function LeafIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg {...iconProps} className={className}>
      <path d="M12 21v-8" />
      <path d="M12 13C12 8 8 5 3 5c0 5 3 8 9 8z" />
      <path d="M12 15c0-4 3-7 9-7 0 5-3 7-9 7z" />
    </svg>
  );
}

function HeartIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg {...iconProps} className={className}>
      <path d="M12 21s-8-5.5-8-11.2A4.8 4.8 0 0 1 12 7a4.8 4.8 0 0 1 8 2.8C20 15.5 12 21 12 21z" />
    </svg>
  );
}

function UsersIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg {...iconProps} className={className}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 21c0-3.5 3-5.5 7-5.5s7 2 7 5.5" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 15.5c2.5.6 4 2.2 4 5" />
    </svg>
  );
}

function ChartIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg {...iconProps} className={className}>
      <path d="M5 20V12M12 20V5M19 20V9" />
    </svg>
  );
}

function CapIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg {...iconProps} className={className}>
      <path d="M2 9l10-5 10 5-10 5-10-5z" />
      <path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5" />
    </svg>
  );
}

function PawIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg {...iconProps} className={className}>
      <circle cx="6" cy="10" r="1.8" />
      <circle cx="10" cy="6" r="1.8" />
      <circle cx="14" cy="6" r="1.8" />
      <circle cx="18" cy="10" r="1.8" />
      <path d="M12 12c-3 0-5 2.5-5 4.5 0 1.5 1.2 2.5 2.7 2.5 1 0 1.5-.5 2.3-.5s1.3.5 2.3.5c1.5 0 2.7-1 2.7-2.5 0-2-2-4.5-5-4.5z" />
    </svg>
  );
}

function BuildingIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg {...iconProps} className={className}>
      <path d="M3 9l9-5 9 5H3z" />
      <path d="M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 21h18" />
    </svg>
  );
}

function ShieldIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg {...iconProps} className={className}>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
      <path d="M8.5 12l2.5 2.5L16 9.5" />
    </svg>
  );
}

const heroCards = [
  {
    title: "Create",
    subtitle: "Real Impact",
    href: "/login?mode=register",
    icon: <LeafIcon />,
    iconBox: "bg-green-100 text-green-600",
    position: "lg:left-0 lg:top-4",
  },
  {
    title: "Find",
    subtitle: "Opportunities",
    href: "/explore",
    icon: <HeartIcon />,
    iconBox: "bg-rose-100 text-rose-500",
    position: "lg:right-0 lg:top-4",
  },
  {
    title: "Join",
    subtitle: "Communities",
    href: "/explore",
    icon: <UsersIcon />,
    iconBox: "bg-blue-100 text-blue-600",
    position: "lg:left-0 lg:bottom-4",
  },
  {
    title: "Track",
    subtitle: "Your Impact",
    href: "/quests",
    icon: <ChartIcon />,
    iconBox: "bg-indigo-100 text-indigo-600",
    position: "lg:right-0 lg:bottom-4",
  },
];

const causes = [
  {
    name: "Environment",
    tagline: "Greener communities",
    icon: <LeafIcon />,
    box: "bg-green-50 hover:bg-green-100",
    iconBox: "bg-green-100 text-green-600",
  },
  {
    name: "Education",
    tagline: "Empowering youth",
    icon: <CapIcon />,
    box: "bg-blue-50 hover:bg-blue-100",
    iconBox: "bg-blue-100 text-blue-600",
  },
  {
    name: "Health",
    tagline: "Stronger lives",
    icon: <HeartIcon />,
    box: "bg-rose-50 hover:bg-rose-100",
    iconBox: "bg-rose-100 text-rose-500",
  },
  {
    name: "Community",
    tagline: "Support & inclusion",
    icon: <UsersIcon />,
    box: "bg-violet-50 hover:bg-violet-100",
    iconBox: "bg-violet-100 text-violet-600",
  },
  {
    name: "Animals",
    tagline: "Care for all",
    icon: <PawIcon />,
    box: "bg-orange-50 hover:bg-orange-100",
    iconBox: "bg-orange-100 text-orange-500",
  },
  {
    name: "Social Welfare",
    tagline: "Build better societies",
    icon: <BuildingIcon />,
    box: "bg-amber-50 hover:bg-amber-100",
    iconBox: "bg-amber-100 text-amber-600",
  },
];

const features = [
  {
    title: "Verified Opportunities",
    text: "Explore genuine and verified volunteer opportunities.",
    icon: <ShieldIcon />,
  },
  {
    title: "Track Your Impact",
    text: "See your contributions and measure the difference you make.",
    icon: <ChartIcon />,
  },
  {
    title: "Trusted Communities",
    text: "Join a safe and supportive community of changemakers.",
    icon: <UsersIcon />,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-sky-100">
      {/* Hero */}
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-10 pt-12 lg:grid-cols-2 lg:pt-16">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-4 py-2 text-sm text-gray-600">
            People &middot; Communities &middot; A Better Tomorrow
          </p>

          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-gray-900 md:text-5xl">
            Connect with people.
            <span className="block">Help your community.</span>
            <span className="block text-blue-600">Change lives.</span>
          </h1>

          <p className="mt-6 max-w-lg text-lg text-gray-600">
            Discover meaningful volunteer opportunities, join passionate
            communities, and make a real difference &mdash; together.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
            >
              Explore Opportunities
              <ArrowIcon />
            </Link>

            <Link
              href="/login?mode=register"
              className="inline-flex items-center rounded-full border border-gray-200 bg-white px-8 py-4 text-lg font-semibold text-gray-800 transition hover:bg-gray-50"
            >
              Join free
            </Link>
          </div>
        </div>

        {/* Floating cards */}
        <div className="relative grid grid-cols-2 gap-4 lg:block lg:h-[360px]">
          <div className="pointer-events-none absolute left-1/2 top-1/2 hidden h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/70 shadow-2xl shadow-blue-200 ring-8 ring-blue-100/60 lg:flex">
            <HeartIcon className="h-12 w-12 text-blue-600" />
          </div>

          {heroCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className={`group flex items-center gap-4 rounded-2xl border border-white bg-white/80 p-4 shadow-lg shadow-blue-100 backdrop-blur transition hover:-translate-y-1 hover:shadow-xl lg:absolute lg:w-64 ${card.position}`}
            >
              <span
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${card.iconBox}`}
              >
                {card.icon}
              </span>
              <span className="flex-1 text-lg font-semibold leading-tight text-gray-900">
                {card.title}
                <span className="block font-medium text-gray-700">
                  {card.subtitle}
                </span>
              </span>
              <ArrowIcon className="h-5 w-5 text-gray-400 transition group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      </section>

      {/* Causes */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        <h2 className="text-center text-2xl font-bold text-gray-900">
          What do you care about?
        </h2>
        <p className="mt-1 text-center text-gray-500">
          Choose a cause and start making a difference.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {causes.map((cause) => (
            <Link
              key={cause.name}
              href={`/explore?category=${encodeURIComponent(cause.name)}`}
              className={`flex items-center gap-3 rounded-2xl p-4 transition ${cause.box}`}
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${cause.iconBox}`}
              >
                {cause.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-gray-900">
                  {cause.name}
                </span>
                <span className="block text-sm text-gray-500">
                  {cause.tagline}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Feature strip */}
      <section className="mt-6 border-t border-gray-100 bg-white/70">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 md:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="flex items-center gap-4">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                {feature.icon}
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
