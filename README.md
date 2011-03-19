[raphael]: http://raphaeljs.com
[cufon]: http://cufon.shoqolate.com
[wordle]: http://www.wordle.net
[feinberg]: http://www.mrfeinberg.com
[stacko]: http://stackoverflow.com/questions/342687/algorithm-to-implement-something-like-wordle
[heroku]: http://jscloud.heroku.com

## What? ##

tagmob.js aims to mimic the functionality of the uber-cool [Wordle Java-Applet][wordle] by
[Jonathan Feinberg][feinberg] using a pure javascript implementation. Fair enough.

It is based on code mercilessly stolen from [Raphaël][raphael] and [Cufón][cufon].
Although Jonathan was not able to provide the source code, he described how
[Wordle actually works][stacko] on stackoverflow.com. Lucky sausages we are.

In contrast to the Java applet, no fancy quadtree or spatial indexing is used so far, only
hierarchical bounding boxes (not even last hit caching). The inital layout is random every time you load a tag cloud,
so you get a new layout all the time. Albeit, the results look quite ok.

You can see tagmob.js working inside a small webapp [here][heroku] or in the tagmob.html provided.


## Usage ##

To create a tagmob, you basically need three things:

  * A list containing your tags.
  * At least one cufon font registered after loading tagmob.js (I have provided a free Helvetica style font by Manfred Klein for your convenience).
  * A canvas element

The list should provide words directly inside the `<li>`elements and a `data-count` attribute, sorted in descending order:

    <ol id="wordcloud">
      <li data-count="150">Ruby</li>
      <li data-count="130">Rails</li>
      <li data-count="90">user</li>
      <li data-count="80">restart</li>
      ...
    </ol>

Your header should contain something like this:

    <script src="http://ajax.googleapis.com/ajax/libs/jquery/1.5.1/jquery.min.js" type="text/javascript"></script>
    <script src="tagmob.js" type="text/javascript"></script>
    <script src="fonts/OldSansBlack_500.font.js" type="text/javascript"></script>
    <script type="text/javascript">
      $(function() {
        var mobCanvas = document.getElementById('myCanvas');
        tagmob.createFromList('wordcloud', mobCanvas);

      });
    </script>

That's it. You should see a tagmob in your canvas element.
If you don't like having a list and want to render the data differently, you can use pass a sorted array like this:

    var words = [
      {word: 'foo', count: 200},
      {word: 'bar', count: 100},
      ...
      {word: 'boo', count:  10}
    ];

    tagmob.create(words, canvas);


## Options ##

Both `tagmob.create`and `tagmob.createFromList` take an options hash as a third parameter:

    {
      rotationProbability: 0.5,       // rotation probability, defaults to height/width ratio
      rotationOrientation: 'right',   // 'left' or 'right' rotation
      color: "#000000",               // word color
      hoverColor: "#00FF00",          // mousehover color
      selectColor: "#FF0000",         // color for currently selected word
      maxFontHeight: 200,             // max font height in pixels
      minFontHeight: 12,              // min font height in pixels
      dontScaleToFit: false,          // if true, tagmob is NOT scaled afterwards to fit into width and height of the canvas.

      // mouse callbacks
      onselect: function(word) {
        alert(word.text + " selected!");
      },
      onunselect: function(word) {},
      onmouseover: function(word) {},
      onmouseout: function(word) {},
    }


## TODO ##

Lots of things to do. Minifying etc. Comments, bug reports and pull requests welcome!

