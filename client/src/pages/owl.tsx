import { PageLayout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";

interface Banner {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  image_url: string | null;
  link_url: string | null;
  is_active: boolean;
  display_order: number;
}

function OwlImageSection() {
  const { data: banners = [] } = useQuery<Banner[]>({
    queryKey: ["/api/banners", "owl"],
    queryFn: async () => {
      const res = await fetch("/api/banners?division=owl");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const images = banners.filter((b) => b.is_active && b.image_url);
  if (images.length === 0) return null;

  if (images.length === 1) {
    const b = images[0];
    const inner = (
      <img
        src={b.image_url!}
        alt={b.title || "올빼미 독학관"}
        className="w-full h-auto block"
        data-testid="owl-hero-image"
      />
    );
    return (
      <div className="w-full">
        {b.link_url ? (
          <a href={b.link_url} target="_blank" rel="noopener noreferrer" className="block">
            {inner}
          </a>
        ) : inner}
      </div>
    );
  }

  if (images.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-1" data-testid="owl-image-grid-2">
        {images.map((b) => (
          <div key={b.id} className="relative overflow-hidden group">
            {b.link_url ? (
              <a href={b.link_url} target="_blank" rel="noopener noreferrer" className="block">
                <img src={b.image_url!} alt={b.title || ""} className="w-full h-auto block transition-transform duration-500 group-hover:scale-105" />
              </a>
            ) : (
              <img src={b.image_url!} alt={b.title || ""} className="w-full h-auto block transition-transform duration-500 group-hover:scale-105" />
            )}
            {b.title && (
              <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pointer-events-none">
                <p className="text-white font-bold text-sm drop-shadow">{b.title}</p>
                {b.subtitle && <p className="text-white/75 text-xs mt-0.5">{b.subtitle}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1" data-testid="owl-image-grid-multi">
      {images.map((b) => (
        <div key={b.id} className="relative overflow-hidden group">
          {b.link_url ? (
            <a href={b.link_url} target="_blank" rel="noopener noreferrer" className="block">
              <img src={b.image_url!} alt={b.title || ""} className="w-full h-auto block transition-transform duration-500 group-hover:scale-105" />
            </a>
          ) : (
            <img src={b.image_url!} alt={b.title || ""} className="w-full h-auto block transition-transform duration-500 group-hover:scale-105" />
          )}
          {b.title && (
            <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pointer-events-none">
              <p className="text-white font-bold text-sm drop-shadow">{b.title}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function Owl() {
  return (
    <PageLayout>
      <OwlImageSection />
    </PageLayout>
  );
}

export function OwlInfo() {
  return <Owl />;
}

export function OwlUsage() {
  return <Owl />;
}
