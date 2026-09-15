export interface Project {
  name: string;
  description: string;
  image: string;
  imageAlt: string;
  url: string;
  services: string[];
}

// Dodaj tu wyłącznie rzeczywiście wykonane projekty i własne zrzuty ekranów.
// Zrzuty umieszczaj w public/work/, np. image: "/work/nazwa-strony.webp".
export const projects: Project[] = [];
