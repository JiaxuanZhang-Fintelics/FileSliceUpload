const SparkMD5 = require("spark-md5");

onmessage = function (e) {
      let chunks = e.data;
      const spark = new SparkMD5.ArrayBuffer();
      let readIndex = 0;
      
      
      async function loadBuffer(){
        if (chunks[readIndex]) {
          let Buffer=await chunks[readIndex].arrayBuffer();
          readIndex++;
          spark.append(Buffer);
          return loadBuffer();
        }
        return postMessage(spark.end());
      }
      loadBuffer();
};
