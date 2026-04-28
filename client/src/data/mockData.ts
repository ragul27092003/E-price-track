export const mockProducts = [
  { id: 1, productCode: "8887549884986", feedName: "AIR-CONDITIONER", brand: "Panasonic", color: "", ageGroup: "", gender: "", material: "", gtin: "", price: 33990, category: "Electronics > Home appliances > Air Conditioners", googleCategory: "Electronics > Home appliances", image: "", optimizedTitle: "", optimizedColor: "" },
  { id: 2, productCode: "8801643710118", feedName: "Haier 43\" Smart TV", brand: "Haier", color: "", ageGroup: "", gender: "", material: "", gtin: "", price: 33990, category: "Electronics > Home Entertainment", googleCategory: "Electronics > Home Entertainment", image: "", optimizedTitle: "", optimizedColor: "" },
  { id: 3, productCode: "8801643710125", feedName: "Voltas 2T Split AC", brand: "Voltas", color: "", ageGroup: "", gender: "", material: "", gtin: "", price: 44490, category: "Electronics > Home appliances", googleCategory: "Electronics > Home appliances", image: "", optimizedTitle: "", optimizedColor: "" },
  { id: 4, productCode: "8801643710132", feedName: "VENTINA 60 Cooler", brand: "Ventina", color: "", ageGroup: "", gender: "", material: "", gtin: "", price: 11990, category: "Electronics > Home appliances", googleCategory: "Electronics > Home appliances", image: "", optimizedTitle: "", optimizedColor: "" },
  { id: 5, productCode: "8801643710149", feedName: "SAMSUNG 18\" Monitor", brand: "Samsung", color: "", ageGroup: "", gender: "", material: "", gtin: "", price: 17790, category: "Electronics > Home appliances", googleCategory: "Electronics > Home appliances", image: "", optimizedTitle: "", optimizedColor: "" },
  { id: 6, productCode: "8801643710156", feedName: "SAMSUNG 7kg Washing Machine", brand: "Samsung", color: "", ageGroup: "", gender: "", material: "", gtin: "", price: 33590, category: "Electronics > Home appliances", googleCategory: "Electronics > Home & Garden", image: "", optimizedTitle: "", optimizedColor: "" },
  { id: 7, productCode: "8801643710163", feedName: "Apple iPhone 14", brand: "Apple", color: "", ageGroup: "", gender: "", material: "", gtin: "", price: 72500, category: "Electronics > Mobile", googleCategory: "Electronics > Mobile Phone", image: "", optimizedTitle: "", optimizedColor: "" },
  { id: 8, productCode: "8801643710170", feedName: "Preethi Xpro Mixer", brand: "Preethi", color: "", ageGroup: "", gender: "", material: "", gtin: "", price: 8990, category: "Electronics > Kitchen", googleCategory: "Electronics > Kitchen Appliances", image: "", optimizedTitle: "", optimizedColor: "" },
  { id: 9, productCode: "8801643710187", feedName: "Haier 55\" 4K TV", brand: "Haier", color: "", ageGroup: "", gender: "", material: "", gtin: "", price: 45990, category: "Electronics > Home Entertainment", googleCategory: "Electronics > Home Entertainment", image: "", optimizedTitle: "", optimizedColor: "" },
  { id: 10, productCode: "8801643710194", feedName: "506 Ltr. Refrigerator", brand: "", color: "", ageGroup: "", gender: "", material: "", gtin: "", price: 84999, category: "Electronics > Home appliances", googleCategory: "Electronics > Home Appliances", image: "", optimizedTitle: "", optimizedColor: "" },
  { id: 11, productCode: "8801643710200", feedName: "LG 20 L Solo Microwave", brand: "LG", color: "", ageGroup: "", gender: "", material: "", gtin: "", price: 8599, category: "Electronics > Kitchen", googleCategory: "Electronics > Kitchen Appliances", image: "", optimizedTitle: "", optimizedColor: "" },
];

export const outputFeeds = [
  { id: 1, feedName: "Google Shopping CSV", products: 5, deliveryMethod: "HTTP", status: "Not yet built" },
];

export const titleOptRules = [
  { id: 1, ruleName: "Television", titleOptStructure: "brand,name", category: "Home Entertainment > Television", productsCount: 2, status: "not started" },
  { id: 2, ruleName: "Air Conditioners", titleOptStructure: "brand,name.color", category: "Home appliances > Air Conditioners", productsCount: 1, status: "not started" },
  { id: 3, ruleName: "Air cooler", titleOptStructure: "brand,name.color", category: "Home appliances > Air cooler", productsCount: 1, status: "not started" },
];

export const feedAuditIssues = {
  high: [
    { issue: "No Colour", products: 11, percentage: "100%" },
    { issue: "No Age Group", products: 11, percentage: "100%" },
    { issue: "No Gender", products: 11, percentage: "100%" },
    { issue: "No Material", products: 11, percentage: "100%" },
    { issue: "Brand not in title", products: 2, percentage: "18.2%" },
    { issue: "No Google Category", products: 11, percentage: "100%" },
  ],
  medium: [
    { issue: "No Pattern", products: 11, percentage: "100%" },
    { issue: "Proper casing", products: 5, percentage: "45.5%" },
    { issue: "No Description", products: 11, percentage: "100%" },
    { issue: "No Short Description", products: 11, percentage: "100%" },
  ],
  low: [
    { issue: "No GTIN", products: 11, percentage: "100%" },
  ],
  others: [
    { issue: "No Unit Key", products: 11, percentage: "100%" },
    { issue: "No Meta Title", products: 11, percentage: "100%" },
    { issue: "No BL Size", products: 11, percentage: "100%" },
    { issue: "No Quantity", products: 11, percentage: "100%" },
    { issue: "No Was Price", products: 11, percentage: "100%" },
    { issue: "No Sale Variation", products: 11, percentage: "100%" },
    { issue: "No SKU Variation", products: 11, percentage: "100%" },
    { issue: "No BL Upc", products: 11, percentage: "100%" },
    { issue: "No Product Highlight 1", products: 11, percentage: "100%" },
    { issue: "No Product Highlight 2", products: 11, percentage: "100%" },
    { issue: "No Product Highlight 3", products: 11, percentage: "100%" },
    { issue: "No Additional Image 3", products: 11, percentage: "100%" },
    { issue: "No Additional Image 4", products: 11, percentage: "100%" },
  ],
};

export const googleCategories = [
  "Electronics > Home Entertainment",
  "Electronics > Home appliances",
  "Electronics > Home & Garden",
  "Electronics > Mobile Phone",
  "Electronics > Kitchen Appliances",
  "Electronics > Audio",
  "Apparel & Accessories > Shoes",
  "Apparel & Accessories > Clothing",
  "Sporting Goods",
  "Health & Beauty",
];
