export type Reagent = {
  id: string;
  name: string;
  unit: string;
  stock: number;
};

const reagents: Reagent[] = [
  { id: "reagent-1", name: "Tris buffer, pH 7.4", unit: "mL", stock: 950 },
  { id: "reagent-2", name: "NaCl", unit: "g", stock: 480 },
  { id: "reagent-3", name: "Ethanol, 70%", unit: "mL", stock: 1200 },
  { id: "reagent-4", name: "PBS", unit: "mL", stock: 60 },
];

export async function listReagents(): Promise<Reagent[]> {
  return [...reagents].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getReagentById(id: string): Promise<Reagent | null> {
  return reagents.find((r) => r.id === id) ?? null;
}

export async function setReagentStock(
  id: string,
  stock: number
): Promise<Reagent | null> {
  const reagent = reagents.find((r) => r.id === id);
  if (!reagent) return null;
  reagent.stock = stock;
  return reagent;
}

export async function createReagent(input: {
  name: string;
  unit: string;
  stock: number;
}): Promise<Reagent> {
  const reagent: Reagent = { ...input, id: crypto.randomUUID() };
  reagents.push(reagent);
  return reagent;
}
