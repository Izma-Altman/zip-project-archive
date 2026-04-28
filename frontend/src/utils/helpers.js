// A universal helper for parsing API responses safely
export const parseResponse = async (res) => {
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return await res.json();
  }
  return { error: `Server Error: Status ${res.status}` };
};

export const parseTechStack = (rawTech, flatTech) => {
  let parsed = null;
  try { parsed = JSON.parse(rawTech); } catch (e) {}

  const catColors = {
    Frontend: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800/50', label: 'Frontend' },
    Backend: { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800/50', label: 'Backend' },
    Database: { bg: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800/50', label: 'Database' },
    MobileApp: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800/50', label: 'Mobile App' },
    Cloud: { bg: 'bg-cyan-50 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800/50', label: 'Cloud' },
    AIModels: { bg: 'bg-rose-50 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800/50', label: 'AI Models' },
    Other: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700', label: 'Other' }
  };

  const techList = [];
  
  if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
    Object.entries(parsed).forEach(([cat, techsStr]) => {
      if (!techsStr || !techsStr.trim()) return;
      const items = techsStr.split(/[,;/|]/).map(t => t.trim()).filter(Boolean);
      items.forEach(item => {
        const style = catColors[cat] || catColors.Other;
        techList.push({ name: item, category: style.label, styleStr: `${style.bg} ${style.text} ${style.border}` });
      });
    });
    return techList;
  }

  if (!flatTech || flatTech === 'N/A') return [];
  const items = flatTech.split(/[,;/|]/).map(t => t.trim()).filter(Boolean);
  const lowerSet = new Set();
  items.forEach(t => {
    if (!lowerSet.has(t.toLowerCase())) {
      lowerSet.add(t.toLowerCase());
      techList.push({ name: t, category: 'Other', styleStr: `${catColors.Other.bg} ${catColors.Other.text} ${catColors.Other.border}` });
    }
  });
  return techList;
};