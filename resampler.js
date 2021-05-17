function cout(string) {
  console.log(string)
}

function Resampler(fromSampleRate, toSampleRate, channels, outputBufferSize, noReturn) {
	this.fromSampleRate = fromSampleRate;
	this.toSampleRate = toSampleRate;
	this.channels = channels | 0;
	this.outputBufferSize = outputBufferSize;
	this.noReturn = !!noReturn;
	this.initialize();
  this.bufferLength;
}
Resampler.prototype.initialize = function() {
	//Perform some checks:
	if(this.fromSampleRate > 0 && this.toSampleRate > 0 && this.channels > 0) {
		if (this.fromSampleRate === this.toSampleRate) {
			//Setup a resampler bypass:
			this.resampler = this.bypassResampler;		//Resampler just returns what was passed through.
			this.ratioWeight = 1;
		}
		else {
			if(this.fromSampleRate < this.toSampleRate) {
				this.compileLinearInterpolationFunction();
				this.lastWeight = 1;
			}
			else {
				this.compileMultiTapFunction();
				this.tailExists = false;
				this.lastWeight = 0;
			}
			this.ratioWeight = this.fromSampleRate / this.toSampleRate;
			this.initializeBuffers();
		}
	}
	else {
		throw(new Error("Invalid settings specified for the resampler."));
	}
}
Resampler.prototype.compileLinearInterpolationFunction = function() {
  this.resampler = function(buffer) {
	  if(!buffer.length) return (this.noReturn) ? 0 : [];
    this.bufferLength = buffer.length,
				outLength = this.outputBufferSize,
				ratioWeight = this.ratioWeight,
				weight = this.lastWeight,
				firstWeight = 0,
				secondWeight = 0,
				sourceOffset = 0,
				outputOffset = 0,
				outputBuffer = this.outputBuffer,
				l0 = this.lastOutput[0],
				l1 = this.lastOutput[1],
				b0 = buffer[0],
				b1 = buffer[1];
		for(; weight < 1; weight += ratioWeight) {
			secondWeight = weight % 1;
			firstWeight = 1 - secondWeight;
			outputBuffer[outputOffset++] = (l0 * firstWeight) + (b0 * secondWeight);
			outputBuffer[outputOffset++] = (l1 * firstWeight) + (b1 * secondWeight);
		}
		
		for(weight -= 1,this.bufferLength -= 2, sourceOffset = weight << 1; outputOffset < outLength && sourceOffset < this.bufferLength;) {
			secondWeight = weight % 1;
			firstWeight = 1 - secondWeight;
			outputBuffer[outputOffset++] = (buffer[sourceOffset] * firstWeight) + (buffer[sourceOffset + 2] * secondWeight);
			outputBuffer[outputOffset++] = (buffer[sourceOffset + 1] * firstWeight) + (buffer[sourceOffset + 3] * secondWeight);
			weight += ratioWeight;
			sourceOffset = weight << 1;
		}
		this.lastOutput[0] = buffer[sourceOffset++];
		this.lastOutput[1] = buffer[sourceOffset++];
		this.lastWeight = weight % 1;
		return this.bufferSlice(outputOffset);
}
	
}
Resampler.prototype.compileMultiTapFunction = function() {
	this.resampler = function(buffer) {
	  if(!buffer.length) return (this.noReturn) ? 0 : [];
		var ratioWeight = this.ratioWeight, weight = 0, output0 = 0, output1 = 0,
				actualPosition = 0, amountToNext = 0,
				alreadyProcessedTail = !this.tailExists,
				outputBuffer = this.outputBuffer, outputOffset = 0, currentPosition = 0;
		this.tailExists = false; 
		do {
			if(alreadyProcessedTail) {
				weight = ratioWeight;
				output0 = 0;
				output1 = 0;
			} else {
				weight = this.lastWeight;
				output0 = this.lastOutput[0];
				output1 = this.lastOutput[1];
				alreadyProcessedTail = true;
			}
			while (weight > 0 && actualPosition < this.bufferLength) {
				amountToNext = 1 + actualPosition - currentPosition;
				if (weight >= amountToNext) {
					output0 += buffer[actualPosition++] * amountToNext;
					output1 += buffer[actualPosition++] * amountToNext;
					currentPosition = actualPosition;
					weight -= amountToNext;
				} else {
					output0 += buffer[actualPosition] * weight;
					output1 += buffer[actualPosition + 1] * weight;
					currentPosition += weight;
					weight = 0;
					break;
				}
			}
			if (weight == 0) {
				outputBuffer[outputOffset++] = output0 / ratioWeight;
				outputBuffer[outputOffset++] = output1 / ratioWeight;
			} else {
				this.lastWeight = weight;
				this.lastOutput[0] = output0;
				this.lastOutput[1] = output1;
				this.tailExists = true;
				break;
			}
		} while (actualPosition < this.bufferLength && outputOffset < outLength);
		return this.bufferSlice(outputOffset);
	}
}
Resampler.prototype.bypassResampler = function(buffer) {
	if(this.noReturn) {
		this.outputBuffer = buffer;
		return buffer.length;
	}
	else {
		return buffer;
	}
}
Resampler.prototype.bufferSlice = function(sliceAmount) {
	if(this.noReturn) {
		return sliceAmount;
	}
	else return this.outputBuffer.subarray(0, sliceAmount);
}
Resampler.prototype.initializeBuffers = function() {
	//Initialize the internal buffer:
	this.outputBuffer = new Float32Array(this.outputBufferSize);
	this.lastOutput = new Float32Array(this.channels);
}
