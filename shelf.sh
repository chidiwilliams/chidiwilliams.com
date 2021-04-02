# Updates the /shelf page. Uses the script at https://github.com/chidiwilliams/scripts/tree/master/goodreads-website-shelf
# to pull in my bookshelf from Goodreads.

curl -L "https://github.com/chidiwilliams/scripts/archive/v1.1.tar.gz" | tar -xz
cd scripts-1.1/goodreads-website-shelf
npm install
node index.js >../../data/shelf.json
cd ../../ && rm -rf scripts-1.1/
