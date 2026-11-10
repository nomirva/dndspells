const files = import.meta.glob('../data/*.json', { eager: true, import: 'default' });

export default Object.values(files).sort((a, b) => a.nameRu.localeCompare(b.nameRu, 'ru'));
