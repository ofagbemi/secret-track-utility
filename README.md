life: the biggest troll
==============
The central theme of my project was the way we represent data. Even something as organic and freeform as music can be recorded and represented mechanically. So I decided to take something that I thought of as very human and apply a very rote, bot-like purpose to the data that I could collect from that clip. I found an API (http://hawttrends.appspot.com/api/terms/) that spit out popular Google search terms and wrote a Python script that would collect these terms, assemble them into a list, and query Google Images for the first few image results for each term. I wrote a C binary that would, using the portsf library, spit out the sound file’s amplitude at each beat (normalized between 0.0 and 1.0) of a given .wav file when supplied a BPM value. These amplitudes were then used to select search terms from the corpus to be displayed.

I wanted to keep kind of a minimalist, old Internet aesthetic, so lots of black and white and Times New Roman, and a couple of hidden features.

I originally did this with a clip from Toro y Moi's "Still Sound". The code for that version can be found here: https://github.com/ofagbemi/179-webproject
