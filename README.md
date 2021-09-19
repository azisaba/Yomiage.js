# Yomiage.js
This is Discord bot program. 
It make it possible to read a message sent by user in Voice Channel instead User. 
  
You can use with docker-compose. docker-compose.yml is located in [example](example) directory. 
You need to change volume path for saving dictionary data. 

## Install with docker-compose
coming soon...

## install without docker-compose
coming soon...

## Develop
### Git branch
This repository adopts git-flow. 

#### Template
```
<type>/<subject>
```

#### Type
- **feature**: A new feature branch
- **release**: A pre-release branch including a batch of feature branches
- **hotfix**: Fix a high-priority bug. checkout master

### Git commit
#### Template
```
<type>: <subject>
```

#### Type
- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools and libraries such as documentation generation

## License
Apache-2.0 License