---
title: A Fear and Loathing of Green
date: 2026-05-12
summary: Astro lovers and the green.
cover: ../astro-gallery/m16/M16 - Eagle Nebula.jpg
coverAlt: M16 — Eagle Nebula
tags: [green, astrophotography]
draft: false
---
Some tend to dislike green since there is almost none of it in the universe, after all. 
The culprits are the black body radiation curve and the stars themselves. 
Even though lots of stars peak around green, they are intense also in blue and red. 
      
***And that is white to us.***

Some greenhorns - sorry guys, we all've been here:) - might get spooked by green by first stretch of their first OSC stretch that comes out totally green. 
It is caused by the RGB Bayer mask that contains more green pixels than red and blue. Thus the signal is stronger in green channel. 

The similar situation is with narrowband SHO images where often we cramp green Ha to green channel with the similar outcome as with OSC.

***And that might lead to a slight green PTSD.***

But. Green is as good colour as any other. We do masage our data to a great extent anyway. It is especially true for narrowband. 
But RGB shots are not always kept as close to reality as possible too. 

***And that is fine. We are mostly not scientists. We are peepers and we do it for looks and peeps:)***

#### Note on SCRN - The Great Green Obliterator
I was doing it too - just run it and the green is gone.

The default *Average Neutral* method computes G' = min(G, ½(R+B)) - meaning it pulls green channel down where green exceeds the average of red and blue.
If used properly it works ok, because green is naturally weak. But if the image is in inbalanced state and green contains legitimate signal it simply 
causes a signal loss. 

It is always better to rein the green with a proper color calibration or narrow band normalization.

***Green isn't evil and can be part of our toolkit to express somethig.***

[Like autumnal melancholy on burning voids](/astro/gallery/m16/)

