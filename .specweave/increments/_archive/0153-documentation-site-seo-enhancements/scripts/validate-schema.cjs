// Extract and validate JSON-LD from build/index.html
const fs = require('fs');
const html = fs.readFileSync('build/index.html', 'utf8');

// Extract JSON-LD scripts
const jsonLdMatches = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/g);

if (!jsonLdMatches) {
  console.error('❌ No JSON-LD found in HTML');
  process.exit(1);
}

console.log(`✅ Found ${jsonLdMatches.length} JSON-LD scripts\n`);

jsonLdMatches.forEach((match, index) => {
  const jsonContent = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
  try {
    const parsed = JSON.parse(jsonContent);
    console.log(`Schema ${index + 1}: ${parsed['@type']}`);
    console.log(JSON.stringify(parsed, null, 2));
    console.log('✅ Valid JSON-LD\n');
  } catch (error) {
    console.error(`❌ Invalid JSON-LD in schema ${index + 1}:`, error.message);
    process.exit(1);
  }
});

console.log('🎉 All JSON-LD schemas are syntactically valid!');
console.log('\n📝 Next step: Test at https://search.google.com/test/rich-results');
console.log('   Enter URL: https://spec-weave.com (after deployment)');
