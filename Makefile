build: 
	docker build -t nasa-tg-bot .

run:
	docker run -d -p 3000:3000 --name nasa-tg-bot --rm nasa-tg-bot