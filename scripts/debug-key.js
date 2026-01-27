import 'dotenv/config';

const key = process.env.STRIPE_SECRET_KEY;
console.log('Key:', key);

for (let i = 0; i < key.length; i++) {
    const char = key[i];
    const code = char.charCodeAt(0);
    if (code > 127) {
        console.log(`Character at index ${i} ('${char}') is INVALID (Code: ${code})`);
    }
}
