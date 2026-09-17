/**
 * Deterministic SKU Category to Prefix Configuration for Tamizh Tech Robotics Company
 * Every category maps to one and only one prefix.
 */

export interface SkuCategoryMapping {
  category: string;
  prefix: string;
  label: string;
  description: string;
}

export const SKU_CATEGORIES: SkuCategoryMapping[] = [
  {
    category: "Motors",
    prefix: "TTRC-MOT",
    label: "Motors & Actuators",
    description: "DC motors, geared motors, stepper motors, and servo actuators",
  },
  {
    category: "Controllers",
    prefix: "TTRC-C",
    label: "Controllers & Boards",
    description: "Microcontrollers, development boards, and motor driver shields",
  },
  {
    category: "Robotics Components",
    prefix: "TTRC-RC",
    label: "Robotics Components",
    description: "Chassis, wheels, couplings, brackets, and structural mechanical parts",
  },
  {
    category: "Competition Kits",
    prefix: "TTRC-KIT",
    label: "Competition Kits",
    description: "RoboRace kits, line follower kits, soccer bot kits, and educational packages",
  },
  {
    category: "Sensors",
    prefix: "TTRC-SEN",
    label: "Sensors & Modules",
    description: "Ultrasonic, IR array, gyro, color, and optical sensors",
  },
  {
    category: "Fabrication",
    prefix: "TTRC-FAB",
    label: "Fabrication & Hardware",
    description: "Filaments, acrylic plates, fasteners, spacers, and raw hardware",
  },
  {
    category: "Services",
    prefix: "TTRC-SRV",
    label: "Engineering & Fabrication Services",
    description: "3D printing, laser cutting, PCB fabrication, and technical engineering services",
  },
  {
    category: "General",
    prefix: "TTRC-PRD",
    label: "General / Standard Products",
    description: "Miscellaneous robotics accessories, requirement-based products, or unmapped items",
  },
];

/**
 * Deterministically returns the standardized prefix for any given category string.
 */
export function getDeterministicSkuPrefix(category: string): string {
  if (!category) return "TTRC-PRD";
  const normalized = category.trim().toLowerCase();

  if (normalized.includes("motor") || normalized.includes("actuator")) {
    return "TTRC-MOT";
  }
  if (normalized.includes("control") || normalized.includes("board") || normalized.includes("driver")) {
    return "TTRC-C";
  }
  if (normalized.includes("component") || normalized.includes("chassis") || normalized.includes("wheel") || normalized.includes("robotics")) {
    return "TTRC-RC";
  }
  if (normalized.includes("kit") || normalized.includes("competition")) {
    return "TTRC-KIT";
  }
  if (normalized.includes("sensor")) {
    return "TTRC-SEN";
  }
  if (normalized.includes("fabricat") || normalized.includes("3d print") || normalized.includes("hardware")) {
    return "TTRC-FAB";
  }
  if (normalized.includes("service")) {
    return "TTRC-SRV";
  }

  return "TTRC-PRD";
}
