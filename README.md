# sql-llm-demo

## General
- Copy config.example.php to config.php
- Write your OpenAI API Key into config.php

## phpMyAdmin Voice Extension
- Put phpmyadmin_voice folder into phpmyadmin's js folder (or better: symlink)
- Write your PHPMYADMIN_URL and API_URL in the php_myadmin_voice/core.js
- Write the following at the end of the file script.twig in phpmyadmin's templates folder
```html
<script data-cfasync="false" type="text/javascript" src="{{ base_dir }}js/phpmyadmin_voice/core.js"></script>
<script data-cfasync="false" type="text/javascript" src="{{ base_dir }}js/phpmyadmin_voice/phpmyadmin_voice.js"></script>
```
