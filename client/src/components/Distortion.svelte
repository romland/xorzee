<link href='https://fonts.googleapis.com/css?family=Varela' rel='stylesheet' type='text/css'>

<div class="glitch" data-text="MintyMint">MintyMint</div> 

<style>
body {
  font-family: 'Varela', sans-serif;
}

.glitch {
  color: black;
  font-size: 100px;
  position: relative;
  width: 400px;
  margin: 0 auto;
  animation: noise-zoom 1s infinite linear alternate-reverse;
}

@keyframes noise-zoom {
  0% {
    transform: scale(0.97);
  }
  10% {
    transform: scale(0.97);
  }
  20% {
    transform: scale(0.98) skew(0deg, 0);
  }
  30% {
    transform: scale(0.97);
  }
  40% {
    transform: scale(0.97);
  }
  50% {
    transform: scale(0.98);
  }
  60% {
    transform: scale(0.98);
  }
  70% {
    transform: scale(0.99);
  }
  80% {
    transform: scale(0.99);
    transform: scale(0.97) skew(-random(10)deg, 0);
  }
  90% {
    transform: scale(0.97);
  }
}
@keyframes noise-anim {
  0% {
    clip: rect(15px, 9999px, 59px, 0);
    text-shadow: 2px 5px 9px rgba(255, 255, 255, 0.8);
  }
  5% {
    clip: rect(15px, 9999px, 19px, 0);
    text-shadow: 1px 9px 2px rgba(255, 255, 255, 0.8);
  }
  10% {
    clip: rect(44px, 9999px, 30px, 0);
    text-shadow: 9px 3px 13px rgba(255, 255, 255, 0.8);
  }
  15% {
    clip: rect(53px, 9999px, 81px, 0);
    text-shadow: 6px -7px 36px rgba(255, 255, 255, 0.8);
  }
  20% {
    clip: rect(88px, 9999px, 51px, 0);
    text-shadow: 9px -6px 24px rgba(255, 255, 255, 0.8);
  }
  25% {
    clip: rect(50px, 9999px, 20px, 0);
    text-shadow: 9px -4px 16px rgba(255, 255, 255, 0.8);
  }
  30% {
    clip: rect(12px, 9999px, 62px, 0);
    text-shadow: -1px -9px 8px rgba(255, 255, 255, 0.8);
  }
  35% {
    clip: rect(16px, 9999px, 76px, 0);
    text-shadow: 7px 9px 36px rgba(255, 255, 255, 0.8);
  }
  40% {
    clip: rect(84px, 9999px, 60px, 0);
    text-shadow: 4px -7px 9px rgba(255, 255, 255, 0.8);
  }
  45% {
    clip: rect(82px, 9999px, 78px, 0);
    text-shadow: -2px 4px 34px rgba(255, 255, 255, 0.8);
  }
  50% {
    clip: rect(14px, 9999px, 65px, 0);
    text-shadow: -8px 1px 38px rgba(255, 255, 255, 0.8);
  }
  55% {
    clip: rect(29px, 9999px, 93px, 0);
    text-shadow: 7px -3px 8px rgba(255, 255, 255, 0.8);
  }
  60% {
    clip: rect(26px, 9999px, 15px, 0);
    text-shadow: 2px 2px 28px rgba(255, 255, 255, 0.8);
  }
  65% {
    clip: rect(9px, 9999px, 84px, 0);
    text-shadow: -3px -4px 18px rgba(255, 255, 255, 0.8);
  }
  70% {
    clip: rect(20px, 9999px, 25px, 0);
    text-shadow: -2px -4px 13px rgba(255, 255, 255, 0.8);
  }
  75% {
    clip: rect(42px, 9999px, 63px, 0);
    text-shadow: -1px -9px 5px rgba(255, 255, 255, 0.8);
  }
  80% {
    clip: rect(73px, 9999px, 71px, 0);
    text-shadow: 3px 8px 6px rgba(255, 255, 255, 0.8);
  }
  85% {
    clip: rect(60px, 9999px, 50px, 0);
    text-shadow: -1px 5px 40px rgba(255, 255, 255, 0.8);
  }
  90% {
    clip: rect(66px, 9999px, 26px, 0);
    text-shadow: 0px -8px 3px rgba(255, 255, 255, 0.8);
  }
  95% {
    clip: rect(9px, 9999px, 69px, 0);
    text-shadow: -9px 2px 19px rgba(255, 255, 255, 0.8);
  }
  100% {
    clip: rect(70px, 9999px, 72px, 0);
    text-shadow: -6px 7px 31px rgba(255, 255, 255, 0.8);
  }
}
.glitch:after {
  content: attr(data-text);
  position: absolute;
  left: 2px;
  text-shadow: -1px 0 red;
  top: 0;
  color: black;
  background: white;
  overflow: hidden;
  clip: rect(0, 900px, 0, 0);
  animation: noise-anim 2s infinite linear alternate-reverse;
}

@keyframes noise-anim-2 {
  0% {
    clip: rect(82px, 9999px, 20px, 0);
    text-shadow: -8px 6px 21px rgba(179, 90, 151, 0.6);
  }
  5% {
    clip: rect(95px, 9999px, 26px, 0);
    text-shadow: 9px 4px 29px rgba(19, 215, 77, 0.6);
  }
  10% {
    clip: rect(19px, 9999px, 46px, 0);
    text-shadow: 4px 1px 4px rgba(181, 111, 88, 0.6);
  }
  15% {
    clip: rect(2px, 9999px, 56px, 0);
    text-shadow: 10px -7px 4px rgba(103, 4, 64, 0.6);
  }
  20% {
    clip: rect(30px, 9999px, 45px, 0);
    text-shadow: 10px -9px 30px rgba(101, 181, 83, 0.6);
  }
  25% {
    clip: rect(22px, 9999px, 94px, 0);
    text-shadow: -2px 0px 3px rgba(246, 148, 137, 0.6);
  }
  30% {
    clip: rect(52px, 9999px, 62px, 0);
    text-shadow: 8px 5px 33px rgba(230, 218, 163, 0.6);
  }
  35% {
    clip: rect(36px, 9999px, 7px, 0);
    text-shadow: 3px 5px 27px rgba(211, 236, 187, 0.6);
  }
  40% {
    clip: rect(25px, 9999px, 42px, 0);
    text-shadow: -3px -9px 28px rgba(100, 94, 216, 0.6);
  }
  45% {
    clip: rect(40px, 9999px, 21px, 0);
    text-shadow: -5px 3px 35px rgba(52, 143, 46, 0.6);
  }
  50% {
    clip: rect(59px, 9999px, 1px, 0);
    text-shadow: 7px 5px 24px rgba(139, 120, 5, 0.6);
  }
  55% {
    clip: rect(85px, 9999px, 63px, 0);
    text-shadow: -8px -2px 9px rgba(74, 121, 107, 0.6);
  }
  60% {
    clip: rect(50px, 9999px, 8px, 0);
    text-shadow: 10px -2px 12px rgba(116, 160, 160, 0.6);
  }
  65% {
    clip: rect(45px, 9999px, 99px, 0);
    text-shadow: 7px -4px 5px rgba(153, 168, 65, 0.6);
  }
  70% {
    clip: rect(8px, 9999px, 89px, 0);
    text-shadow: -6px 5px 37px rgba(66, 105, 34, 0.6);
  }
  75% {
    clip: rect(5px, 9999px, 8px, 0);
    text-shadow: 9px -9px 28px rgba(248, 161, 191, 0.6);
  }
  80% {
    clip: rect(29px, 9999px, 60px, 0);
    text-shadow: 7px 4px 5px rgba(223, 82, 64, 0.6);
  }
  85% {
    clip: rect(43px, 9999px, 80px, 0);
    text-shadow: 2px 4px 25px rgba(213, 161, 17, 0.6);
  }
  90% {
    clip: rect(51px, 9999px, 75px, 0);
    text-shadow: 9px 2px 2px rgba(115, 70, 39, 0.6);
  }
  95% {
    clip: rect(35px, 9999px, 25px, 0);
    text-shadow: 6px 10px 2px rgba(96, 180, 163, 0.6);
  }
  100% {
    clip: rect(53px, 9999px, 17px, 0);
    text-shadow: -3px 10px 18px rgba(173, 252, 122, 0.6);
  }
}
.glitch:before {
  content: attr(data-text);
  position: absolute;
  left: -2px;
  text-shadow: 1px 0 blue;
  top: 0;
  color: black;
  background: white;
  overflow: hidden;
  clip: rect(0, 900px, 0, 0);
  animation: noise-anim-2 3s infinite linear alternate-reverse;
}
</style>