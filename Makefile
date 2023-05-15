build: 
	docker build -t tg-gpt-chat .

run:
	docker run -d -p 3000:3000 --name tg-gpt-chat --rm tg-gpt-chat