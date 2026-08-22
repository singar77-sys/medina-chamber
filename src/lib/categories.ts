/**
 * Member-directory category normalization.
 *
 * GrowthZone hands us ~215 raw member categories with heavy fragmentation —
 * many are exact synonyms ("Construction Company" vs "Construction Companies,
 * General Contractors/Dev") or hyper-specific one-offs, so a business tagged
 * with one label never appears when a visitor clicks a sibling label. This maps
 * variant labels to a single canonical name so the browse chips and category
 * filtering stop fragmenting members across synonyms.
 *
 * Applied at READ time (see lib/directory.ts + the directory page), so it
 * survives the nightly gz-sync, which re-populates the raw category rows from
 * GrowthZone. To adjust: the value (right-hand side) is the chip label shown;
 * add/remove rows freely — anything not listed keeps its original label.
 */
export const CATEGORY_ALIASES: Record<string, string> = {
  // Accounting & Tax
  "Accountants-Certified-Public": "Accounting & Tax Services",
  "Accounting Service": "Accounting & Tax Services",
  "Accounting, Taxes & Payroll Service": "Accounting & Tax Services",

  // Advertising & Marketing
  "Advertising & Media": "Advertising & Marketing",
  "Advertising Agencies": "Advertising & Marketing",
  "Advertising Opportunities": "Advertising & Marketing",
  "Advertising/Promotional Literature": "Advertising & Marketing",
  "Digital Marketing & Social Media": "Advertising & Marketing",
  "Marketing Companies": "Advertising & Marketing",
  "Social Media Marketing": "Advertising & Marketing",
  "Promotions": "Advertising & Marketing",
  "Cable TV Advertising": "Advertising & Marketing",
  "Radio Broadcasting/Stations": "Advertising & Marketing",
  "Television-Cable": "Advertising & Marketing",

  // Automobile Repairs & Service
  "Auto Detailing": "Automobile Repairs & Service",
  "Automobile & RV Repair": "Automobile Repairs & Service",
  "Automobile Body Shop": "Automobile Repairs & Service",
  "Automotive Wheel Sales & Refinishing": "Automobile Repairs & Service",
  "Truck & Trailer Repair Service": "Automobile Repairs & Service",

  // Automobile & Truck Dealers
  "Automobile Dealers": "Automobile & Truck Dealers",
  "Automobile Parts": "Automobile & Truck Dealers",
  "Truck Sales": "Automobile & Truck Dealers",
  "Truck, Sales, Service & Leasing": "Automobile & Truck Dealers",

  // Banks
  "Credit Unions": "Banks & Banking Associations",

  // Banquet & Conference Center
  "Conference Center/Special Events": "Banquet & Conference Center",

  // Business Consulting & Services
  "Business & Management Consultants": "Business Consulting & Services",
  "Business & Professional Services": "Business Consulting & Services",
  "Business Advisor/Services": "Business Consulting & Services",
  "Business Development/Networking": "Business Consulting & Services",
  "Business/Development Consultants": "Business Consulting & Services",
  "Consultant": "Business Consulting & Services",
  "Consulting Firm": "Business Consulting & Services",
  "Professional Development": "Business Consulting & Services",
  "Acquisitions/Business Sale": "Business Consulting & Services",
  "International Trade Consultant": "Business Consulting & Services",

  // Child Care & Preschools
  "Child Care": "Child Care & Preschools",
  "Children's Programs": "Child Care & Preschools",
  "Schools, Pre-schools, Child Care": "Child Care & Preschools",

  // Cleaning Services
  "Cleaning Service/Commercial/New Construction": "Cleaning Services",
  "Cleaning Service/Residential/Commercial": "Cleaning Services",

  // Computer & IT Services
  "Computer Consulting Services": "Computer & IT Services",
  "Computer Repair": "Computer & IT Services",
  "Computer Services/Internet Provider": "Computer & IT Services",
  "IT Contractor": "Computer & IT Services",
  "Technology Consulting": "Computer & IT Services",

  // Construction & General Contractors
  "Construction Company": "Construction & General Contractors",
  "Construction Companies, General Contractors/Dev": "Construction & General Contractors",
  "Construction Companies, Excavation, Concrete": "Construction & General Contractors",
  "Concrete Contractor": "Construction & General Contractors",
  "Contractor Services": "Construction & General Contractors",
  "Contractor, General": "Construction & General Contractors",
  "Contractors-Electrical, Plumbing & Mechanical": "Construction & General Contractors",

  // Dentists / Dental
  "Orthodontists": "Dentists/Dental Care",

  // Financial Advisors & Planning
  "Financial & Financial Planners": "Financial Advisors & Planning",
  "Financial Advisor": "Financial Advisors & Planning",
  "Investment Counselors": "Financial Advisors & Planning",
  "Investment Services": "Financial Advisors & Planning",
  "Stocks & Bonds Brokers": "Financial Advisors & Planning",
  "Mortgage Loans & Bankers": "Financial Advisors & Planning",
  "Finance & Insurance": "Financial Advisors & Planning",

  // Churches & Religious
  "Religious Organizations": "Church",

  // Gifts
  "Greeting cards/Gift shop": "Gifts",

  // Health & Wellness
  "Health & Fitness": "Health & Wellness",
  "Fitness": "Health & Wellness",
  "Health/Herbal Products": "Health & Wellness",
  "Health and Beauty": "Health & Wellness",

  // Health Care (clinical)
  "Medical Test Facility": "Health Care",
  "Occupational Health Provider": "Health Care",
  "Hearing Aids/Testing": "Health Care",

  // Home Improvement
  "Painting Contractors": "Home Improvement",
  "Flooring": "Home Improvement",
  "Garage Doors/Sales & Service": "Home Improvement",
  "Glass": "Home Improvement",
  "Granite/Cabinetry": "Home Improvement",
  "Interior Designers/Retail Furnishings": "Home Improvement",
  "Furnishings, Personalized, Custom": "Home Improvement",
  "Home & Garden": "Home Improvement",
  "Paint Store": "Home Improvement",

  // Human Resources & Staffing
  "Human Resource Consulting": "Human Resources & Staffing",
  "Human Resource Mgmt.": "Human Resources & Staffing",
  "Employment Agencies & Contractors": "Human Resources & Staffing",
  "Personnel Leasing": "Human Resources & Staffing",
  "Recruitment-Professional": "Human Resources & Staffing",

  // Insurance
  "Commercial Insurance": "Insurance",

  // Landscaping & Lawn Care
  "Landscape Design & Building": "Landscaping & Lawn Care",
  "Lawn & Landscape Service": "Landscaping & Lawn Care",
  "Tree Service": "Landscaping & Lawn Care",
  "Garden Centers & Nurseries": "Landscaping & Lawn Care",

  // Manufacturing
  "Manufacturing, Production & Wholesale": "Manufacturing",
  "Manufacturer Rep.": "Manufacturing",
  "Assembly & Packaging": "Manufacturing",
  "Machinery Sales": "Manufacturing",
  "Industrial Supplies & Services": "Manufacturing",
  "Polymer Research & Development": "Manufacturing",

  // Photography
  "Aerial Photography": "Photography",
  "Photography-Commercial": "Photography",
  "Photography/Studio": "Photography",

  // Plumbing, Heating & Cooling
  "Heating & Air Conditioning Service & Sales": "Plumbing, Heating & Cooling",
  "Plumbing Contractor": "Plumbing, Heating & Cooling",
  "Plumbing, Heating & Sprinkler Systems": "Plumbing, Heating & Cooling",
  "Refrigeration Commercial/Restaurant Equipment Repair": "Plumbing, Heating & Cooling",

  // Printing & Publishing
  "Printers, Graphics, Advertising Specialties": "Printing & Publishing",
  "Printers, Publishers, Typesetters & Graphics": "Printing & Publishing",
  "Screen Printing & Embroidery": "Printing & Publishing",
  "Signs": "Printing & Publishing",
  "Publications": "Printing & Publishing",
  "Newspapers": "Printing & Publishing",
  "Magazine": "Printing & Publishing",

  // Real Estate
  "Real Estate - Commercial/Industrial": "Real Estate",
  "Real Estate Appraiser": "Real Estate",
  "Real Estate Developers & Investors": "Real Estate",
  "Real Estate Development - Property Managers": "Real Estate",
  "Real Estate-Residential": "Real Estate",

  // Restaurants
  "Restaurants, Food & Beverages": "Restaurants/Clubs",

  // Schools & Education
  "Tutoring": "Schools, Colleges & Education",

  // Security Services
  "Security - Products, Systems, Burglar Alarms & Companies": "Security Services",
  "Electronic Monitoring": "Security Services",

  // Senior Living & Care
  "Assisted Living Community": "Senior Living & Care",
  "Senior Independent Living": "Senior Living & Care",
  "Nursing Homes": "Senior Living & Care",

  // Beauty
  "Barbershop": "Beauty Salons",

  // Sports & Recreation
  "Sports": "Sports & Recreation",
  "Family Entertainment Center": "Sports & Recreation",
  "Shooting Range": "Sports & Recreation",
  "Indoor Golf Course": "Golf Courses/Public",

  // Telecommunications
  "Cellular Phone Sales & Service": "Telecommunications",
};

export function normalizeCategory(name: string): string {
  return CATEGORY_ALIASES[name] ?? name;
}

/** Normalize + de-duplicate a member's category list, preserving order. */
export function normalizeCategories(cats: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of cats) {
    const n = normalizeCategory(c);
    if (!seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}
