// A made-up estate for the "Show me an example" button and the tests. Every name and address is fictional.
export const EXAMPLE = {
  d_name: "ROBERT ALAN SAMPLE", d_aka: "Bob Sample", d_date: "2026-08-14", d_lived: "ca", d_county: "San Luis Obispo",
  partner: "spouse", s_name: "Linda Marie Sample", married_date: "1988-06-11", married_place: "Fresno, California", ended: "no",
  filer: "self",
  will: "no",
  children: "yes", child_count: "many", child_kinds: ["natural"], grandkids: "no", stepchild: "is_not",
  assets: [
    { kind: "real", label: "Home at 123 Example Lane, Los Osos, California", apn: "074-123-456",
      legal: "Lot 12 of Tract 1234, in the County of San Luis Obispo, State of California, as shown on the map recorded in Book 10, Page 20 of Maps.",
      title: "sole", basis: "community", source: "earnings", acquired: "1995-04-03",
      funds: "Down payment from joint savings; mortgage paid from both spouses’ wages" },
    { kind: "real", label: "One-half interest in 456 Sample Street, San Luis Obispo, California", apn: "002-456-789",
      legal: "Lot 7 of Tract 5678, in the County of San Luis Obispo, State of California, as shown on the map recorded in Book 22, Page 8 of Maps.",
      title: "other_tic", share: "50", co_owner: "Daniel Sample", basis: "community", source: "earnings", acquired: "2018-09-20",
      funds: "Down payment from joint savings; mortgage paid from wages" },
    { kind: "vehicle", label: "2021 Example Motors Sedan, VIN ending 4821, California license 8ABC123", title: "sole",
      basis: "community", source: "earnings", acquired: "2021-02-15", funds: "Paid from joint savings" },
    { kind: "account", label: "Example Credit Union checking account ending 3307", title: "beneficiary" },
  ],
  people: [
    { name: "Daniel Sample", relation: "Son", adult: true, age: "", address: "456 Sample Street\nSan Luis Obispo, CA 93401", deceased: false },
    { name: "Rosa Sample", relation: "Daughter", adult: true, age: "", address: "789 Placeholder Avenue\nPortland, OR 97201", deceased: false },
  ],
  county: "San Luis Obispo", court_street: "100 Example Court Street", court_mailing: "Same",
  court_cityzip: "San Luis Obispo, CA 93408", court_branch: "Main",
  c_name: "Linda Marie Sample", c_street: "123 Example Lane", c_city: "Los Osos", c_state: "CA", c_zip: "93402",
  c_phone: "(805) 555-0142", c_email: "linda@example.com",
};
