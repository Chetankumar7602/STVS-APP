import mongoose from 'mongoose';

const VolunteerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    maxlength: [60, 'Name cannot be more than 60 characters'],
  },
  phone: {
    type: String,
    required: [true, 'Please provide a phone number'],
    maxlength: [20, 'Phone cannot be more than 20 characters'],
  },
  interest: {
    type: String,
    required: [true, 'Please provide an area of interest'],
    maxlength: [200, 'Interest cannot be more than 200 characters'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Volunteer || mongoose.model('Volunteer', VolunteerSchema);
