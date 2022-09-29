//单个切片大小
const chunkSize = 12*1024;
const fs = require('fs');
const path = require('path');
const { Blob } = require("buffer");
const axios = require('axios').default;
const base64Arraybuffer = require("base64-arraybuffer")
const Worker = require("web-worker")
/**
 * file: 文件上传时，通过e.target.files[0]拿到的值
 */
function createFileChunk(file){
  console.log(file)
      let current = 0;
      // 保存与返回所有切片的参数
      let chunks = [];
      while (current < file.size) {
        // 文件进行切片
        const chunk = file.slice(current, current + chunkSize);
        chunks.push(chunk);
        current = current + chunkSize;
      }
  return chunks;
}

    /**
     * 计算md5值
     */
async function calculationChunksMd5(chunks){
  return new Promise((resolve) => {
    // Using worker
    const worker = new Worker("./calculateMd5.js");
    worker.postMessage(chunks);
    worker.onmessage = (e) => {
      resolve(e.data);
    };
  });
};

/**
* Make chunks into base64 strings
*/
async function chunkToText(chunks){

  let readIndex = 0;
  let text=[];
  async function loadText(){
    if (chunks[readIndex]) {
      let buffer=await chunks[readIndex].arrayBuffer();
      let Text=base64Arraybuffer.encode(buffer);
      readIndex++;
      text.push(Text);
      return loadText()
    }
    return text;
  }
  let Text=await loadText();
  return Text;
}


    

      // formDatasType = {
       // formData: FormData; // 切片上传请求的参数
       // index: number; // 当前切片是第几个
       // error: number; // 当前切片上传错误次数
       // progress: number; // 当前切片上传进度
      //};
  
      /**
       * 创建请求参数数组
       */
function createPostFormData(chunks, fileHash) {
  const formDatas = chunks.map( (chunk, index) => {
    // 请求的参数创建
    const formData=JSON.parse("{}");
    formData.chunk= chunk; 
    formData.hash= fileHash;
    formData.index=index;
    // 添加额外参数，可以做错误重试，进度等操作
    return { formData, index, error: 0, progress: 0 };
  });
  return formDatas;
}
  


        /**
     * 将文件上传服务器
     */
function postToServer(postFormData, limit = 3) {
  return new Promise((resolve) => {
    let len = postFormData.length;
    let counter = 0;
    const startPost = async () => {
      // 注意这个方法会改变原数组
      const formDatas = postFormData.shift();
      // No more data to post
      if (!formDatas) {
        return;
      }
      // Post request to /uploadfile using axios
      axios.post("http://localhost:8000/uploadfile",
      JSON.stringify(formDatas.formData),
      { headers: { "Content-Type": "application/json" } })
      .then((res)=>{
        // Optional response log
        if(res.status!=200)console.log(res.status+"@"+formDatas.formData.index);
        console.log(res.data)
      });

  
      // 所有请求都已结束，我们需要结束外面的Promise
      if (counter == len - 1) {
        resolve(true);
      }
      counter++;
      // 请求还未结束,继续启动任务
      startPost();
    };
  
    // 初始启动limt个任务
    for (let index = 0; index < limit; index++) {
      startPost();
    }
  });
}
/**
 * A simple test function
 * Input file name, then upload and combine
 */
async function test(target) {
  // Read target file from disk
  let raw = fs.readFileSync(path.join(__dirname, target));
  const buff = Buffer.from(raw); 
  // Convert to blob
  let blob=new Blob([buff],{ type: "image/jpg"});
  // Get upload data
  const chunks = createFileChunk(blob);
  let fileHash = await calculationChunksMd5(chunks);
  let chunkText=await chunkToText(chunks)
  console.log("是否已上传？ 是否已上传部分? 如果上传了部分，那么上传了那部分");
  const postFormData = await createPostFormData(chunkText, fileHash);
  await postToServer(postFormData);
  console.log("将hash和文件后缀发送给后端，让其合并文件");
  // Send request to /combine to combine chunks
  const jsonHash=JSON.parse("{}"); 
  jsonHash.hash=fileHash;
  axios.post("http://localhost:8000/combine",
  JSON.stringify(jsonHash),
  { headers: { "Content-Type": "application/json" } })
  .then((res)=>{
    console.log("Combine:"+res.status);
  });
}

test("8kTest.jpg");
